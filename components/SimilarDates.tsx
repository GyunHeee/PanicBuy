"use client";

import { useEffect, useState } from "react";
import type { DailyScoreRecord, SignalLevel } from "../types";

type SimilarDatesProps = {
  totalScore: number | null;
};

const SIGNAL_META: Record<SignalLevel, { emoji: string; label: string }> = {
  caution: { emoji: "🔵", label: "과열 구간" },
  neutral: { emoji: "⚪", label: "평소" },
  watch: { emoji: "🟡", label: "약한 신호 감지" },
  alert: { emoji: "🔴", label: "강한 신호 감지" }
};

export function SimilarDates({ totalScore }: SimilarDatesProps) {
  const [data, setData] = useState<DailyScoreRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (totalScore === null) {
      return;
    }

    let isMounted = true;

    async function loadSimilarDates() {
      try {
        setData(null);
        setError(null);
        const response = await fetch(`/api/similar-dates?score=${totalScore}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = (await response.json()) as DailyScoreRecord[];
        if (isMounted) {
          setData(result);
        }
      } catch {
        if (isMounted) {
          setError("비슷했던 과거 날짜를 불러오지 못했습니다.");
        }
      }
    }

    loadSimilarDates();

    return () => {
      isMounted = false;
    };
  }, [totalScore]);

  const visibleData = totalScore === null ? [] : data;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">
        오늘과 비슷했던 과거 날짜
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        저장된 기록 중 오늘 점수와 가장 가까웠던 날을 보여줘요.
      </p>

      <div className="mt-4">
        {error ? (
          <div className="rounded-md bg-slate-50 px-4 py-6 text-sm text-slate-500">
            {error}
          </div>
        ) : !visibleData ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : visibleData.length === 0 ? (
          <div className="rounded-md bg-slate-50 px-4 py-6 text-sm text-slate-500">
            아직 비교할 과거 기록이 부족해요.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {visibleData.map((record) => {
              const meta = SIGNAL_META[record.signal];
              return (
                <div
                  key={record.date}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-sm font-medium text-slate-500">
                    {record.date}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {Math.round(record.totalScore)}
                    <span className="text-base font-medium text-slate-500">
                      /100
                    </span>
                  </p>
                  <p className="mt-3 text-sm text-slate-600">
                    {meta.emoji} {meta.label}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
