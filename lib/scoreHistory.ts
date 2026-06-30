import { kv } from "@vercel/kv";
import type { DailyScoreRecord, SignalLevel, StreakInfo } from "../types";

const DATE_SET_KEY = "score:dates";

function hasKvEnv(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export function isScoreHistoryEnabled(): boolean {
  return hasKvEnv();
}

function dateScore(date: string): number {
  return Date.parse(date);
}

function isSignalLevel(value: unknown): value is SignalLevel {
  return (
    value === "caution" ||
    value === "neutral" ||
    value === "watch" ||
    value === "alert"
  );
}

function isDailyScoreRecord(value: unknown): value is DailyScoreRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Partial<DailyScoreRecord> & { date?: string };
  return (
    (typeof record.marketDate === "string" || typeof record.date === "string") &&
    typeof record.totalScore === "number" &&
    isSignalLevel(record.signal)
  );
}

function normalizeDailyScoreRecord(value: unknown): DailyScoreRecord | null {
  if (!isDailyScoreRecord(value)) {
    return null;
  }

  const record = value as DailyScoreRecord & { date?: string };
  return {
    marketDate: record.marketDate ?? record.date,
    totalScore: record.totalScore,
    signal: record.signal
  };
}

function sortByDate(records: DailyScoreRecord[]): DailyScoreRecord[] {
  return [...records].sort((a, b) => a.marketDate.localeCompare(b.marketDate));
}

// Saves or overwrites a daily score record. Missing KV env vars make this a no-op for local development.
export async function saveDailyScore(
  record: DailyScoreRecord,
  options: { overwrite?: boolean } = {}
): Promise<void> {
  if (!hasKvEnv()) {
    console.warn("Vercel KV env vars are missing. Daily score was not saved.");
    return;
  }

  const shouldOverwrite = options.overwrite ?? true;
  if (!shouldOverwrite) {
    const existing = await kv.get<unknown>(`score:${record.marketDate}`);
    if (normalizeDailyScoreRecord(existing) !== null) {
      console.info(
        `Daily score for ${record.marketDate} already exists. Skipping overwrite.`
      );
      return;
    }
  }

  await Promise.all([
    kv.set(`score:${record.marketDate}`, record),
    kv.zadd(DATE_SET_KEY, {
      score: dateScore(record.marketDate),
      member: record.marketDate
    })
  ]);
}

// Returns the subset of dates that already have saved daily score records.
export async function getExistingScoreDates(dates: string[]): Promise<Set<string>> {
  if (!hasKvEnv() || dates.length === 0) {
    return new Set();
  }

  const records = await kv.mget<unknown[]>(...dates.map((date) => `score:${date}`));
  return new Set(
    dates.filter((_, index) => normalizeDailyScoreRecord(records[index]) !== null)
  );
}

// Returns recent score records in ascending date order. Missing KV env vars return an empty history.
export async function getScoreHistory(
  days: number
): Promise<DailyScoreRecord[]> {
  if (!hasKvEnv()) {
    return [];
  }

  const safeDays = Math.max(1, Math.min(3650, Math.floor(days)));
  const dates = await kv.zrange<string[]>(
    DATE_SET_KEY,
    -safeDays,
    -1
  );

  if (dates.length === 0) {
    return [];
  }

  const records = await kv.mget<unknown[]>(...dates.map((date) => `score:${date}`));
  return sortByDate(
    records
      .map(normalizeDailyScoreRecord)
      .filter((record): record is DailyScoreRecord => record !== null)
  );
}

// Finds past records with scores closest to the current score, excluding today's date.
export async function findSimilarPastDates(
  currentScore: number,
  days: number = 5
): Promise<DailyScoreRecord[]> {
  if (!hasKvEnv()) {
    return [];
  }

  const dates = await kv.zrange<string[]>(DATE_SET_KEY, 0, -1);
  if (dates.length === 0) {
    return [];
  }

  const today = new Date().toISOString().slice(0, 10);
  const records = await kv.mget<unknown[]>(...dates.map((date) => `score:${date}`));
  const safeDays = Math.max(1, Math.min(30, Math.floor(days)));

  return records
    .map(normalizeDailyScoreRecord)
    .filter((record): record is DailyScoreRecord => record !== null)
    .filter((record) => record.marketDate !== today)
    .sort(
      (a, b) =>
        Math.abs(a.totalScore - currentScore) -
        Math.abs(b.totalScore - currentScore)
    )
    .slice(0, safeDays);
}

// Calculates how long the most recent signal level has continued.
export async function calculateStreak(): Promise<StreakInfo> {
  const history = sortByDate(await getScoreHistory(60)).reverse();

  if (history.length === 0) {
    return {
      currentSignal: "neutral",
      streakDays: 0,
      previousSignal: null,
      changedToday: false
    };
  }

  const currentSignal = history[0].signal;
  let streakDays = 1;
  let previousSignal: SignalLevel | null = null;

  for (const record of history.slice(1)) {
    if (record.signal !== currentSignal) {
      previousSignal = record.signal;
      break;
    }

    streakDays += 1;
  }

  return {
    currentSignal,
    streakDays,
    previousSignal,
    changedToday:
      history.length >= 2 ? history[1].signal !== currentSignal : false
  };
}
