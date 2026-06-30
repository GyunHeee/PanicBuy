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
  // Market close date used as the basis for this signal, not the user's local calendar date.
  marketDate: string;
  totalScore: number;
  signal: SignalLevel;
  description: string;
  beginnerDescription: string;
  conditionsMet: string[];
  beginnerConditionsMet: string[];
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

export interface DailyScoreRecord {
  marketDate: string;
  totalScore: number;
  signal: SignalLevel;
}

export interface StreakInfo {
  currentSignal: SignalLevel;
  streakDays: number;
  previousSignal: SignalLevel | null;
  changedToday: boolean;
}
