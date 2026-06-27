import { existsSync, readFileSync } from "node:fs";
import {
  get10yRateHistory,
  getFearGreedIndex,
  getSpyHistory,
  getVixHistory
} from "../lib/dataFetcher.ts";
import {
  alignTimeSeriesByDate,
  calculateMA200Deviation,
  calculateRSI,
  calculateRateChange
} from "../lib/indicators.ts";
import { calculateSignal } from "../lib/scoring.ts";

function loadLocalEnv() {
  const envPath = ".env.local";
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    process.env[key] = value.replace(/^["']|["']$/g, "");
  }
}

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

async function run() {
  loadLocalEnv();

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
    throw new Error("No aligned finite indicator row was available.");
  }

  const result = calculateSignal(
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

  console.log(`Latest aligned market date: ${dates[latestIndex]}`);
  console.log(JSON.stringify(result, null, 2));
  console.log(
    "Score range check",
    result.totalScore >= 0 && result.totalScore <= 100
  );
  console.log(
    "Signal value check",
    ["caution", "neutral", "watch", "alert"].includes(result.signal)
  );
  console.log(
    "Conditions text check",
    result.conditionsMet.every((condition) => condition.length > 0)
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
