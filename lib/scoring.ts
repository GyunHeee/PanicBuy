import { percentileRank } from "./indicators.ts";
import type {
  IndicatorRaw,
  IndicatorScore,
  SignalLevel,
  SignalResult
} from "../types/index.ts";

type HistoricalContext = {
  vixHistory: number[];
  rsiHistory: number[];
  ma200DevHistory: number[];
  rateChangeHistory: number[];
  fearGreedHistory: number[];
};

type RiskPercentiles = {
  vix: number;
  rsi: number;
  ma200Deviation: number;
  rate10yChange: number;
  fearGreed: number;
};

const BASE_WEIGHTS = {
  vix: 25,
  rsi: 15,
  ma200Deviation: 30,
  rate10yChange: 20,
  fearGreed: 10
} satisfies IndicatorScore;

const DESCRIPTION_BY_SIGNAL: Record<SignalLevel, string> = {
  caution: "시장이 과열 구간에 있어요",
  neutral: "특별한 신호 없는 평소 구간이에요",
  watch: "공포 심리가 일부 감지되는 구간이에요",
  alert: "시장 전반에 강한 공포 신호가 감지되는 구간이에요"
};

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function finiteHistory(values: number[]): number[] {
  return values.filter((value) => Number.isFinite(value));
}

function roundScore(value: number): number {
  return Number(value.toFixed(2));
}

function toSignalLevel(totalScore: number): SignalLevel {
  if (totalScore <= 20) {
    return "caution";
  }

  if (totalScore <= 45) {
    return "neutral";
  }

  if (totalScore <= 70) {
    return "watch";
  }

  return "alert";
}

function buildWeights(hasFearGreed: boolean): IndicatorScore {
  if (hasFearGreed) {
    return BASE_WEIGHTS;
  }

  const normalizeRatio = 100 / 90;
  return {
    vix: BASE_WEIGHTS.vix * normalizeRatio,
    rsi: BASE_WEIGHTS.rsi * normalizeRatio,
    ma200Deviation: BASE_WEIGHTS.ma200Deviation * normalizeRatio,
    rate10yChange: BASE_WEIGHTS.rate10yChange * normalizeRatio,
    fearGreed: 0
  };
}

function weightedScore(percentile: number, weight: number): number {
  return (percentile / 100) * weight;
}

function topPercentileText(riskPercentile: number): string {
  return (100 - riskPercentile).toFixed(0);
}

function buildConditions(
  rawValues: IndicatorRaw,
  riskPercentiles: RiskPercentiles,
  hasFearGreed: boolean
): string[] {
  const conditions: string[] = [];

  if (riskPercentiles.vix >= 70) {
    conditions.push(
      `VIX가 최근 2년 중 상위 ${topPercentileText(riskPercentiles.vix)}%`
    );
  }

  if (riskPercentiles.rsi >= 70) {
    conditions.push(
      `RSI가 최근 2년 중 하위 ${topPercentileText(riskPercentiles.rsi)}%`
    );
  }

  if (riskPercentiles.ma200Deviation >= 70) {
    conditions.push(
      `S&P500이 200일선 대비 ${rawValues.ma200Deviation.toFixed(1)}% 이탈`
    );
  }

  if (riskPercentiles.rate10yChange >= 70) {
    conditions.push(
      `10년물 금리가 최근 1개월간 급등 (상위 ${topPercentileText(riskPercentiles.rate10yChange)}%)`
    );
  }

  if (hasFearGreed && riskPercentiles.fearGreed >= 70) {
    conditions.push(
      `공포탐욕지수가 최근 범위 중 하위 ${topPercentileText(riskPercentiles.fearGreed)}%`
    );
  }

  return conditions;
}

// Converts raw indicator values into weighted scores and a non-advisory market signal.
export function calculateSignal(
  rawValues: IndicatorRaw,
  historicalContext: HistoricalContext
): SignalResult {
  const hasFearGreed =
    rawValues.fearGreed !== null &&
    finiteHistory(historicalContext.fearGreedHistory).length > 0;
  const weights = buildWeights(hasFearGreed);

  const riskPercentiles: RiskPercentiles = {
    vix: percentileRank(rawValues.vix, historicalContext.vixHistory),
    rsi: 100 - percentileRank(rawValues.rsi, historicalContext.rsiHistory),
    ma200Deviation:
      100 -
      percentileRank(
        rawValues.ma200Deviation,
        historicalContext.ma200DevHistory
      ),
    rate10yChange: percentileRank(
      rawValues.rate10yChange,
      historicalContext.rateChangeHistory
    ),
    fearGreed: hasFearGreed
      ? 100 -
        percentileRank(
          rawValues.fearGreed as number,
          historicalContext.fearGreedHistory
        )
      : 0
  };

  const scores: IndicatorScore = {
    vix: roundScore(weightedScore(riskPercentiles.vix, weights.vix)),
    rsi: roundScore(weightedScore(riskPercentiles.rsi, weights.rsi)),
    ma200Deviation: roundScore(
      weightedScore(riskPercentiles.ma200Deviation, weights.ma200Deviation)
    ),
    rate10yChange: roundScore(
      weightedScore(riskPercentiles.rate10yChange, weights.rate10yChange)
    ),
    fearGreed: roundScore(
      weightedScore(riskPercentiles.fearGreed, weights.fearGreed)
    )
  };

  const totalScore = roundScore(
    scores.vix +
      scores.rsi +
      scores.ma200Deviation +
      scores.rate10yChange +
      scores.fearGreed
  );
  const signal = toSignalLevel(totalScore);

  return {
    date: todayString(),
    totalScore,
    signal,
    description: DESCRIPTION_BY_SIGNAL[signal],
    conditionsMet: buildConditions(rawValues, riskPercentiles, hasFearGreed),
    rawValues,
    scores
  };
}
