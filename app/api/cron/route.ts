import { NextResponse } from "next/server";
import {
  get10yRateHistory,
  getFearGreedIndex,
  getSpyHistory,
  getVixHistory
} from "../../../lib/dataFetcher";
import { sendDiscordSignal } from "../../../lib/discord";
import {
  alignTimeSeriesByDate,
  calculateMA200Deviation,
  calculateRSI,
  calculateRateChange
} from "../../../lib/indicators";
import { calculateSignal } from "../../../lib/scoring";
import {
  getExistingScoreDates,
  saveDailyScore
} from "../../../lib/scoreHistory";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SCORE_BACKFILL_TRADING_DAYS = 30;

function latestFiniteIndex(seriesList: number[][]): number {
  const longestLength = Math.max(...seriesList.map((values) => values.length));

  for (let index = longestLength - 1; index >= 0; index -= 1) {
    if (seriesList.every((values) => Number.isFinite(values[index]))) {
      return index;
    }
  }

  return -1;
}

function recentFiniteIndexes(seriesList: number[][], limit: number): number[] {
  const indexes: number[] = [];
  const longestLength = Math.max(...seriesList.map((values) => values.length));

  for (let index = longestLength - 1; index >= 0; index -= 1) {
    if (seriesList.every((values) => Number.isFinite(values[index]))) {
      indexes.push(index);
    }

    if (indexes.length >= limit) {
      break;
    }
  }

  return indexes.reverse();
}

function finiteBefore(values: number[], index: number): number[] {
  return values.slice(0, index).filter((value) => Number.isFinite(value));
}

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return true;
  }

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [vixHistory, spyHistory, rateHistory, fearGreed] = await Promise.all([
    getVixHistory("2y"),
    getSpyHistory("2y"),
    get10yRateHistory(),
    getFearGreedIndex()
  ]);

  const aligned = alignTimeSeriesByDate([vixHistory, spyHistory, rateHistory]);
  const dates = aligned.map((point) => point.date);
  const vixValues = aligned.map((point) => point.values[0]);
  const spyPrices = aligned.map((point) => point.values[1]);
  const rates = aligned.map((point) => point.values[2]);
  const rsiValues = calculateRSI(spyPrices);
  const ma200DeviationValues = calculateMA200Deviation(spyPrices);
  const rateChangeValues = calculateRateChange(rates);
  const indicatorSeries = [
    vixValues,
    rsiValues,
    ma200DeviationValues,
    rateChangeValues
  ];

  const latestIndex = latestFiniteIndex(indicatorSeries);

  if (latestIndex < 0) {
    return NextResponse.json(
      { error: "No aligned finite indicator row was available." },
      { status: 500 }
    );
  }

  function calculateSignalAtIndex(index: number, fearGreedValue: number | null) {
    const signal = calculateSignal(
      {
        vix: vixValues[index],
        rsi: rsiValues[index],
        ma200Deviation: ma200DeviationValues[index],
        rate10yChange: rateChangeValues[index],
        fearGreed: fearGreedValue
      },
      {
        vixHistory: finiteBefore(vixValues, index),
        rsiHistory: finiteBefore(rsiValues, index),
        ma200DevHistory: finiteBefore(ma200DeviationValues, index),
        rateChangeHistory: finiteBefore(rateChangeValues, index),
        fearGreedHistory: []
      }
    );

    return {
      ...signal,
      marketDate: dates[index]
    };
  }

  const signalWithDate = calculateSignalAtIndex(
    latestIndex,
    fearGreed
  );

  await sendDiscordSignal(signalWithDate);

  try {
    const candidateIndexes = recentFiniteIndexes(
      indicatorSeries,
      SCORE_BACKFILL_TRADING_DAYS
    );
    const candidateDates = candidateIndexes.map((index) => dates[index]);
    const existingDates = await getExistingScoreDates(candidateDates);
    const missingIndexes = candidateIndexes.filter(
      (index) => !existingDates.has(dates[index])
    );
    const backfillRecords = missingIndexes.map((index) => {
      const signalForDate =
        index === latestIndex
          ? signalWithDate
          : calculateSignalAtIndex(index, null);

      return {
        marketDate: signalForDate.marketDate,
        totalScore: signalForDate.totalScore,
        signal: signalForDate.signal
      };
    });

    await Promise.all(
      backfillRecords.map((record) =>
        saveDailyScore(record, { overwrite: false })
      )
    );
    console.info(
      `Daily score backfill checked ${candidateIndexes.length} trading days and saved ${backfillRecords.length} missing records.`
    );
  } catch (error) {
    console.error("Daily score save failed", error);
  }

  return NextResponse.json({
    ok: true,
    signal: signalWithDate
  });
}
