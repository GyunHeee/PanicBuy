export interface IndicatorRaw {
  vix: number;
  rsi: number;
  ma200Deviation: number;
  rate10yChange: number;
  fearGreed: number | null;
}

export interface IndicatorScore {
  vix: number;
  rsi: number;
  ma200Deviation: number;
  rate10yChange: number;
  fearGreed: number;
}

export type SignalLevel = "caution" | "neutral" | "watch" | "alert";

export interface SignalResult {
  date: string;
  totalScore: number;
  signal: SignalLevel;
  description: string;
  conditionsMet: string[];
  rawValues: IndicatorRaw;
  scores: IndicatorScore;
}

export interface BacktestPeriodStats {
  avg: number;
  median: number;
  max: number;
  min: number;
  winRate: number;
}

export interface BacktestStats {
  signal: SignalLevel;
  occurrences: number;
  returns: {
    day30: BacktestPeriodStats;
    day90: BacktestPeriodStats;
    day180: BacktestPeriodStats;
    day365: BacktestPeriodStats;
  };
}
