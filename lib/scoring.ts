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

const BEGINNER_DESCRIPTION_BY_SIGNAL: Record<SignalLevel, string> = {
  caution:
    "지금은 시장이 많이 올라서 들뜬 상태예요. 이럴 때 너무 많이 사면 나중에 떨어질 때 손해를 크게 볼 수 있어요.",
  neutral:
    "지금은 특별히 불안하거나 들뜬 분위기가 없는, 평범한 시장 상태예요.",
  watch:
    "시장에 약간 불안한 분위기가 보여요. 역사적으로 이런 시기엔 주가가 단기간 흔들렸다가 회복하는 경우가 많았어요.",
  alert:
    "지금은 시장에 꽤 강한 불안감이 퍼져있는 상태예요. 무서운 시기지만, 과거 데이터를 보면 이런 시기에 꾸준히 투자한 사람들이 나쁘지 않은 결과를 얻은 경우도 많았어요."
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

export function mapToBeginnerLanguage(condition: string): string {
  if (condition.includes("VIX")) {
    return "사람들이 평소보다 많이 불안해하고 있어요 (VIX 기준)";
  }

  if (condition.includes("200일선")) {
    return "최근 평균 가격보다 주가가 꽤 많이 떨어져 있어요";
  }

  if (condition.includes("금리")) {
    return "최근 한 달 동안 미국 금리가 빠르게 올랐어요 (주식엔 부담 요인)";
  }

  if (condition.includes("RSI")) {
    return "최근 주가가 단기간에 많이 내려온 상태예요 (RSI 기준)";
  }

  if (condition.includes("공포탐욕")) {
    return "투자자들이 평소보다 겁을 많이 내는 분위기예요 (공포탐욕지수 기준)";
  }

  return condition;
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
  const conditionsMet = buildConditions(rawValues, riskPercentiles, hasFearGreed);

  return {
    marketDate: todayString(),
    totalScore,
    signal,
    description: DESCRIPTION_BY_SIGNAL[signal],
    beginnerDescription: BEGINNER_DESCRIPTION_BY_SIGNAL[signal],
    conditionsMet,
    beginnerConditionsMet: conditionsMet.map(mapToBeginnerLanguage),
    rawValues,
    scores
  };
}
