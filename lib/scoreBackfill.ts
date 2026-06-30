import {
  get10yRateHistory,
  getSpyHistory,
  getVixHistory
} from "./dataFetcher";
import {
  alignTimeSeriesByDate,
  calculateMA200Deviation,
  calculateRSI,
  calculateRateChange
} from "./indicators";
import { calculateSignal } from "./scoring";
import {
  getExistingScoreDates,
  isScoreHistoryEnabled,
  saveDailyScore
} from "./scoreHistory";

const MAX_BACKFILL_TRADING_DAYS = 365;

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

export async function backfillMissingDailyScores(
  requestedDays: number
): Promise<{ checked: number; saved: number }> {
  if (!isScoreHistoryEnabled()) {
    return { checked: 0, saved: 0 };
  }

  const limit = Math.max(
    1,
    Math.min(MAX_BACKFILL_TRADING_DAYS, Math.floor(requestedDays))
  );

  const [vixHistory, spyHistory, rateHistory] = await Promise.all([
    getVixHistory("3y"),
    getSpyHistory("3y"),
    get10yRateHistory()
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

  const candidateIndexes = recentFiniteIndexes(indicatorSeries, limit);
  const candidateDates = candidateIndexes.map((index) => dates[index]);
  const existingDates = await getExistingScoreDates(candidateDates);
  const missingIndexes = candidateIndexes.filter(
    (index) => !existingDates.has(dates[index])
  );

  const records = missingIndexes.map((index) => {
    const signal = calculateSignal(
      {
        vix: vixValues[index],
        rsi: rsiValues[index],
        ma200Deviation: ma200DeviationValues[index],
        rate10yChange: rateChangeValues[index],
        fearGreed: null
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
      marketDate: dates[index],
      totalScore: signal.totalScore,
      signal: signal.signal
    };
  });

  await Promise.all(
    records.map((record) => saveDailyScore(record, { overwrite: false }))
  );

  return {
    checked: candidateIndexes.length,
    saved: records.length
  };
}
