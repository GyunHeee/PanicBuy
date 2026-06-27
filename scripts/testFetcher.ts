import { existsSync, readFileSync } from "node:fs";
import {
  get10yRateHistory,
  getFearGreedIndex,
  getSpyHistory,
  getVixHistory,
  type TimeSeriesPoint
} from "../lib/dataFetcher.ts";

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

function preview(points: TimeSeriesPoint[]) {
  return {
    count: points.length,
    first3: points.slice(0, 3),
    last3: points.slice(-3)
  };
}

async function run() {
  loadLocalEnv();

  const vix = await getVixHistory("2y");
  console.log("VIX 2y", preview(vix));

  const spy = await getSpyHistory("2y");
  console.log("SPY 2y", preview(spy));

  try {
    const rate10y = await get10yRateHistory();
    console.log("DGS10 10y", preview(rate10y));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("FRED_API_KEY is required")
    ) {
      console.warn(
        "DGS10 skipped: .env.local에 FRED_API_KEY가 없어서 FRED 데이터를 가져오지 못했습니다."
      );
    } else {
      throw error;
    }
  }

  const fearGreed = await getFearGreedIndex();
  console.log("Fear & Greed today", fearGreed);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
