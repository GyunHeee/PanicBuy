"use client";

import { useEffect, useState } from "react";
import type { BacktestStats, SignalLevel } from "../types";

type BacktestYears = 10 | 20;
type BacktestResponse = {
  years: BacktestYears;
  results: BacktestStats[];
};

const SIGNAL_META: Record<SignalLevel, { emoji: string; label: string }> = {
  caution: { emoji: "🔵", label: "과열 구간" },
  neutral: { emoji: "⚪", label: "평소" },
  watch: { emoji: "🟡", label: "약한 신호 감지" },
  alert: { emoji: "🔴", label: "강한 신호 감지" }
};

function formatPercent(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(2)}%` : "N/A";
}

function percentClassName(value: number): string {
  if (!Number.isFinite(value)) {
    return "text-slate-500";
  }

  return value >= 0 ? "text-emerald-700" : "text-red-700";
}

export function BacktestTable() {
  const [years, setYears] = useState<BacktestYears>(20);
  const [data, setData] = useState<BacktestStats[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBacktest() {
      try {
        const response = await fetch(`/api/backtest?years=${years}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = (await response.json()) as BacktestResponse;
        if (isMounted) {
          setData(result.results);
        }
      } catch {
        if (isMounted) {
          setError("백테스트 데이터를 불러오지 못했습니다.");
        }
      }
    }

    loadBacktest();

    return () => {
      isMounted = false;
    };
  }, [years]);

  function handleYearsChange(nextYears: BacktestYears) {
    setData(null);
    setError(null);
    setYears(nextYears);
  }

  if (error) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        {error}
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">
            백테스트 결과
          </h2>
          <YearSelector years={years} onChange={handleYearsChange} />
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          {years}년 백테스트 계산 중... (최대 1분 소요)
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">
            백테스트 결과 ({years}년)
          </h2>
          <YearSelector years={years} onChange={handleYearsChange} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="whitespace-nowrap px-5 py-3 font-medium">
                신호 단계
              </th>
              <th className="whitespace-nowrap px-5 py-3 font-medium">
                발생횟수
              </th>
              <th className="whitespace-nowrap px-5 py-3 font-medium">
                30일 평균수익률
              </th>
              <th className="whitespace-nowrap px-5 py-3 font-medium">
                90일 평균수익률
              </th>
              <th className="whitespace-nowrap px-5 py-3 font-medium">
                180일 평균수익률
              </th>
              <th className="whitespace-nowrap px-5 py-3 font-medium">
                365일 평균수익률
              </th>
              <th className="whitespace-nowrap px-5 py-3 font-medium">
                승률(365일)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => {
              const meta = SIGNAL_META[row.signal];
              return (
                <tr key={row.signal}>
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-950">
                    {meta.emoji} {meta.label}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                    {row.occurrences}
                  </td>
                  <td
                    className={`whitespace-nowrap px-5 py-4 font-medium ${percentClassName(
                      row.returns.day30.avg
                    )}`}
                  >
                    {formatPercent(row.returns.day30.avg)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-5 py-4 font-medium ${percentClassName(
                      row.returns.day90.avg
                    )}`}
                  >
                    {formatPercent(row.returns.day90.avg)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-5 py-4 font-medium ${percentClassName(
                      row.returns.day180.avg
                    )}`}
                  >
                    {formatPercent(row.returns.day180.avg)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-5 py-4 font-medium ${percentClassName(
                      row.returns.day365.avg
                    )}`}
                  >
                    {formatPercent(row.returns.day365.avg)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-5 py-4 font-medium ${percentClassName(
                      row.returns.day365.winRate
                    )}`}
                  >
                    {formatPercent(row.returns.day365.winRate)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function YearSelector({
  years,
  onChange
}: {
  years: BacktestYears;
  onChange: (years: BacktestYears) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
      {[20, 10].map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option as BacktestYears)}
          className={`rounded px-3 py-1.5 text-sm font-medium ${
            years === option
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {option}년
        </button>
      ))}
    </div>
  );
}
