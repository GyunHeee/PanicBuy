import { existsSync, readFileSync } from "node:fs";
import { runBacktest } from "../lib/backtest.ts";

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

function formatPercent(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(2)}%` : "N/A";
}

async function run() {
  loadLocalEnv();

  console.time("runBacktest(20)");
  const stats = await runBacktest(20);
  console.timeEnd("runBacktest(20)");

  console.table(
    stats.map((stat) => ({
      signal: stat.signal,
      occurrences: stat.occurrences,
      "30d avg": formatPercent(stat.returns.day30.avg),
      "30d win": formatPercent(stat.returns.day30.winRate),
      "90d avg": formatPercent(stat.returns.day90.avg),
      "90d win": formatPercent(stat.returns.day90.winRate),
      "180d avg": formatPercent(stat.returns.day180.avg),
      "180d win": formatPercent(stat.returns.day180.winRate),
      "365d avg": formatPercent(stat.returns.day365.avg),
      "365d win": formatPercent(stat.returns.day365.winRate)
    }))
  );

  const alertCount = stats.find((stat) => stat.signal === "alert")?.occurrences ?? 0;
  if (alertCount >= 100) {
    console.warn(
      "alert 발생 횟수가 선택한 기간에 수백 번 수준이면 너무 자주 발생하는 것일 수 있습니다."
    );
  }

  if (alertCount <= 1) {
    console.warn(
      "alert 발생 횟수가 0~1번이면 임계값이 너무 빡빡한 것일 수 있습니다."
    );
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
