import { kv } from "@vercel/kv";
import type { DailyScoreRecord, SignalLevel } from "../types";

const DATE_SET_KEY = "score:dates";

function hasKvEnv(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
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

  const record = value as Partial<DailyScoreRecord>;
  return (
    typeof record.date === "string" &&
    typeof record.totalScore === "number" &&
    isSignalLevel(record.signal)
  );
}

function sortByDate(records: DailyScoreRecord[]): DailyScoreRecord[] {
  return [...records].sort((a, b) => a.date.localeCompare(b.date));
}

// Saves or overwrites a daily score record. Missing KV env vars make this a no-op for local development.
export async function saveDailyScore(
  record: DailyScoreRecord
): Promise<void> {
  if (!hasKvEnv()) {
    console.warn("Vercel KV env vars are missing. Daily score was not saved.");
    return;
  }

  await Promise.all([
    kv.set(`score:${record.date}`, record),
    kv.zadd(DATE_SET_KEY, {
      score: dateScore(record.date),
      member: record.date
    })
  ]);
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
  return sortByDate(records.filter(isDailyScoreRecord));
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
    .filter(isDailyScoreRecord)
    .filter((record) => record.date !== today)
    .sort(
      (a, b) =>
        Math.abs(a.totalScore - currentScore) -
        Math.abs(b.totalScore - currentScore)
    )
    .slice(0, safeDays);
}
