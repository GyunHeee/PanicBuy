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
import { saveDailyScore } from "../../../lib/scoreHistory";

function latestFiniteIndex(values: number[]): number {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (Number.isFinite(values[index])) {
      return index;
    }
  }

  return -1;
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

  const latestIndex = Math.min(
    latestFiniteIndex(vixValues),
    latestFiniteIndex(rsiValues),
    latestFiniteIndex(ma200DeviationValues),
    latestFiniteIndex(rateChangeValues)
  );

  if (latestIndex < 0) {
    return NextResponse.json(
      { error: "No aligned finite indicator row was available." },
      { status: 500 }
    );
  }

  const signal = calculateSignal(
    {
      vix: vixValues[latestIndex],
      rsi: rsiValues[latestIndex],
      ma200Deviation: ma200DeviationValues[latestIndex],
      rate10yChange: rateChangeValues[latestIndex],
      fearGreed
    },
    {
      vixHistory: finiteBefore(vixValues, latestIndex),
      rsiHistory: finiteBefore(rsiValues, latestIndex),
      ma200DevHistory: finiteBefore(ma200DeviationValues, latestIndex),
      rateChangeHistory: finiteBefore(rateChangeValues, latestIndex),
      fearGreedHistory: []
    }
  );
  const signalWithDate = {
    ...signal,
    date: dates[latestIndex]
  };

  await sendDiscordSignal(signalWithDate);

  try {
    await saveDailyScore({
      date: signalWithDate.date,
      totalScore: signalWithDate.totalScore,
      signal: signalWithDate.signal
    });
  } catch (error) {
    console.error("Daily score save failed", error);
  }

  return NextResponse.json({
    ok: true,
    signal: signalWithDate
  });
}
