import fs from "node:fs";
import { saveDailyScore } from "../lib/scoreHistory.ts";
import type { SignalLevel } from "../types/index.ts";

// 테스트용 임시 데이터 삽입 스크립트입니다. 확인 후 KV에서 해당 날짜 데이터를 삭제해도 됩니다.
// 사용 예: npm run seed:streak

function loadLocalEnv() {
  const path = ".env.local";

  if (!fs.existsSync(path)) {
    return;
  }

  for (const line of fs.readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 1);
    process.env[key] = value;
  }
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

async function run() {
  loadLocalEnv();

  const signal: SignalLevel = "watch";
  const records = [
    { marketDate: daysAgo(3), totalScore: 54, signal: "neutral" as SignalLevel },
    { marketDate: daysAgo(2), totalScore: 59, signal },
    { marketDate: daysAgo(1), totalScore: 61, signal },
    { marketDate: daysAgo(0), totalScore: 57, signal }
  ];

  for (const record of records) {
    await saveDailyScore(record);
  }

  console.table(records);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
