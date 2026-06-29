import { mean, median } from "simple-statistics";
import {
  get10yRateHistory,
  getSpyHistory,
  getVixHistory
} from "./dataFetcher.ts";
import {
  alignTimeSeriesByDate,
  calculateMA200Deviation,
  calculateRSI,
  calculateRateChange
} from "./indicators.ts";
import { calculateSignal } from "./scoring.ts";
import type {
  BacktestPeriodStats,
  BacktestStats,
  SignalLevel
} from "../types/index.ts";

type LabeledSignal = {
  date: string;
  signal: SignalLevel;
  spyIndex: number;
};

const SIGNAL_LEVELS: SignalLevel[] = ["caution", "neutral", "watch", "alert"];
const WINDOW_DAYS = 504;
const RETURN_PERIODS = {
  day30: 30,
  day90: 90,
  day180: 180,
  day365: 365
} as const;

function latestFiniteStartIndex(seriesList: number[][]): number {
  return seriesList.reduce((startIndex, series) => {
    const firstFiniteIndex = series.findIndex((value) => Number.isFinite(value));
    return Math.max(startIndex, firstFiniteIndex);
  }, 0);
}

function valuesBefore(values: number[], index: number): number[] {
  return values
    .slice(Math.max(0, index - WINDOW_DAYS), index)
    .filter((value) => Number.isFinite(value));
}

function emptyPeriodStats(): BacktestPeriodStats {
  return {
    avg: Number.NaN,
    median: Number.NaN,
    max: Number.NaN,
    min: Number.NaN,
    winRate: Number.NaN
  };
}

function summarizeReturns(returns: number[]): BacktestPeriodStats {
  if (returns.length === 0) {
    return emptyPeriodStats();
  }

  return {
    avg: Number(mean(returns).toFixed(2)),
    median: Number(median(returns).toFixed(2)),
    max: Number(Math.max(...returns).toFixed(2)),
    min: Number(Math.min(...returns).toFixed(2)),
    winRate: Number(
      ((returns.filter((value) => value > 0).length / returns.length) * 100).toFixed(
        2
      )
    )
  };
}

function collectReturns(
  labels: LabeledSignal[],
  spyPrices: number[],
  signal: SignalLevel,
  forwardDays: number
): number[] {
  return labels.flatMap((label) => {
    if (label.signal !== signal) {
      return [];
    }

    const futureIndex = label.spyIndex + forwardDays;
    const currentPrice = spyPrices[label.spyIndex];
    const futurePrice = spyPrices[futureIndex];
    if (!Number.isFinite(currentPrice) || !Number.isFinite(futurePrice)) {
      return [];
    }

    return [((futurePrice - currentPrice) / currentPrice) * 100];
  });
}

function buildStats(labels: LabeledSignal[], spyPrices: number[]): BacktestStats[] {
  return SIGNAL_LEVELS.map((signal) => ({
    signal,
    occurrences: labels.filter((label) => label.signal === signal).length,
    returns: {
      day30: summarizeReturns(
        collectReturns(labels, spyPrices, signal, RETURN_PERIODS.day30)
      ),
      day90: summarizeReturns(
        collectReturns(labels, spyPrices, signal, RETURN_PERIODS.day90)
      ),
      day180: summarizeReturns(
        collectReturns(labels, spyPrices, signal, RETURN_PERIODS.day180)
      ),
      day365: summarizeReturns(
        collectReturns(labels, spyPrices, signal, RETURN_PERIODS.day365)
      )
    }
  }));
}

// Runs a rolling-window signal backtest. It fetches years + 2 years so the
// first labeled day has a full 504-trading-day historical window.
export async function runBacktest(years: number = 20): Promise<BacktestStats[]> {
  const historyYears = years + 2;
  const yahooPeriod = `${historyYears}y` as const;
  const [spyHistory, vixHistory, rateHistory] = await Promise.all([
    getSpyHistory(yahooPeriod),
    getVixHistory(yahooPeriod),
    get10yRateHistory(historyYears)
  ]);

  const aligned = alignTimeSeriesByDate([spyHistory, vixHistory, rateHistory]);
  const dates = aligned.map((point) => point.date);
  const spyPrices = aligned.map((point) => point.values[0]);
  const vixValues = aligned.map((point) => point.values[1]);
  const rates = aligned.map((point) => point.values[2]);
  const rsiValues = calculateRSI(spyPrices);
  const ma200DeviationValues = calculateMA200Deviation(spyPrices);
  const rateChangeValues = calculateRateChange(rates);

  const firstValidIndex = Math.max(
    WINDOW_DAYS,
    latestFiniteStartIndex([
      spyPrices,
      vixValues,
      rsiValues,
      ma200DeviationValues,
      rateChangeValues
    ])
  );
  const labels: LabeledSignal[] = [];

  // Accuracy first: percentileRank sorts rolling windows on every day.
  // If this exceeds ~30 seconds for larger datasets, optimize with rolling sorted windows.
  for (let index = firstValidIndex; index < dates.length; index += 1) {
    const rawValues = {
      vix: vixValues[index],
      rsi: rsiValues[index],
      ma200Deviation: ma200DeviationValues[index],
      rate10yChange: rateChangeValues[index],
      fearGreed: null
    };

    if (
      !Number.isFinite(rawValues.vix) ||
      !Number.isFinite(rawValues.rsi) ||
      !Number.isFinite(rawValues.ma200Deviation) ||
      !Number.isFinite(rawValues.rate10yChange)
    ) {
      continue;
    }

    const signal = calculateSignal(rawValues, {
      vixHistory: valuesBefore(vixValues, index),
      rsiHistory: valuesBefore(rsiValues, index),
      ma200DevHistory: valuesBefore(ma200DeviationValues, index),
      rateChangeHistory: valuesBefore(rateChangeValues, index),
      fearGreedHistory: []
    });

    labels.push({
      date: dates[index],
      signal: signal.signal,
      spyIndex: index
    });
  }

  return buildStats(labels, spyPrices);
}
