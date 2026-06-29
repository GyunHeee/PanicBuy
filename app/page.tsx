import { headers } from "next/headers";
import { BacktestTable } from "../components/BacktestTable";
import { Disclaimer } from "../components/Disclaimer";
import { SignalDashboard } from "../components/SignalDashboard";
import type { SignalResult } from "../types";

function isSignalResult(value: unknown): value is SignalResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const result = value as Partial<SignalResult>;
  return (
    typeof result.date === "string" &&
    typeof result.totalScore === "number" &&
    typeof result.signal === "string" &&
    typeof result.description === "string" &&
    typeof result.beginnerDescription === "string" &&
    Array.isArray(result.conditionsMet) &&
    Array.isArray(result.beginnerConditionsMet) &&
    typeof result.rawValues === "object" &&
    result.rawValues !== null &&
    typeof result.scores === "object" &&
    result.scores !== null
  );
}

async function getBaseUrl(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

async function getSignal(): Promise<{
  signal: SignalResult | null;
  error: string | null;
}> {
  try {
    const response = await fetch(`${await getBaseUrl()}/api/signal`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return { signal: null, error: "오늘의 신호 API 응답이 실패했습니다." };
    }

    const data = await response.json();
    if (!isSignalResult(data)) {
      return {
        signal: null,
        error: "오늘의 신호 API가 아직 SignalResult 형식으로 완성되지 않았습니다."
      };
    }

    return { signal: data, error: null };
  } catch {
    return { signal: null, error: "오늘의 신호 데이터를 불러오지 못했습니다." };
  }
}

export default async function Home() {
  const { signal, error } = await getSignal();

  return (
    <>
      <Disclaimer />
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <header>
            <p className="text-sm font-medium text-slate-500">
              S&P500 기반 시장 신호 대시보드
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">
              오늘의 시장 신호
            </h1>
          </header>

          <SignalDashboard signal={signal} error={error} />
          <BacktestTable />

          <footer className="border-t border-slate-200 py-6">
            <p className="text-sm text-slate-500">
              데이터 출처: Yahoo Finance, FRED
            </p>
            <div className="mt-2">
              <Disclaimer compact />
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
