"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { DailyScoreRecord } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

type PeriodOption = {
  days: number;
  label: string;
};

type ChartPoint = DailyScoreRecord & {
  timestamp: number;
};

const PERIOD_OPTIONS: PeriodOption[] = [
  { days: 30, label: "30일" },
  { days: 90, label: "90일" },
  { days: 365, label: "1년" }
];

function signalLabel(signal: DailyScoreRecord["signal"]): string {
  switch (signal) {
    case "caution":
      return "과열 구간";
    case "neutral":
      return "평소";
    case "watch":
      return "약한 신호 감지";
    case "alert":
      return "강한 신호 감지";
  }
}

export function ScoreTrendChart() {
  const [days, setDays] = useState(90);
  const [data, setData] = useState<DailyScoreRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadHistory = useCallback(async (nextDays: number) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      setDays(nextDays);
      setData(null);
      setError(null);

      const response = await fetch(
        `/api/score-history?days=${nextDays}&t=${Date.now()}`,
        {
          cache: "no-store"
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = (await response.json()) as DailyScoreRecord[];
      if (requestId !== requestIdRef.current) {
        return;
      }

      setData(result);
    } catch {
      if (requestId === requestIdRef.current) {
        setError("점수 기록을 불러오지 못했습니다.");
      }
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadHistory(90);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadHistory]);

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!data) {
      return [];
    }

    return data.map((record) => ({
      ...record,
      timestamp: Date.parse(`${record.marketDate}T00:00:00.000Z`)
    }));
  }, [data]);

  const latestTimestamp =
    chartData.length > 0
      ? chartData[chartData.length - 1].timestamp
      : 0;
  const xDomain: [number, number] = [
    latestTimestamp - Math.max(1, days - 1) * DAY_MS,
    latestTimestamp
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            점수 추이
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            시장 마감 기준으로 저장된 일일 신호 점수의 흐름을 보여줘요.
          </p>
        </div>
        <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.days}
              type="button"
              onClick={() => void loadHistory(option.days)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                days === option.days
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {data ? (
        <p className="mt-3 text-xs text-slate-500">
          선택 기간 {days}일 중 저장된 시장 마감 기록 {data.length}개를 표시하고 있어요.
        </p>
      ) : null}

      <div className="mt-5 h-72">
        {error ? (
          <div className="flex h-full items-center justify-center rounded-md bg-slate-50 text-sm text-slate-500">
            {error}
          </div>
        ) : !data ? (
          <div className="h-full animate-pulse rounded-md bg-slate-100" />
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md bg-slate-50 px-4 text-center text-sm text-slate-500">
            아직 기록이 없어요. 매일 자동으로 기록이 쌓이니 며칠 후 다시 확인해보세요.
          </div>
        ) : (
          <div className="h-full">
            <ResponsiveContainer key={days} width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 16, bottom: 8, left: 0 }}
              >
                <ReferenceArea y1={0} y2={20} fill="#dbeafe" fillOpacity={0.45} />
                <ReferenceArea y1={21} y2={45} fill="#f1f5f9" fillOpacity={0.8} />
                <ReferenceArea y1={46} y2={70} fill="#fef3c7" fillOpacity={0.55} />
                <ReferenceArea y1={71} y2={100} fill="#fee2e2" fillOpacity={0.55} />
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={xDomain}
                  minTickGap={24}
                  tickFormatter={(value) =>
                    new Date(Number(value)).toISOString().slice(5, 10)
                  }
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  width={32}
                />
                <Tooltip
                  formatter={(value, name, props) => {
                    const payload = props.payload as ChartPoint | undefined;
                    if (name === "totalScore") {
                      return [
                        `${Number(value).toFixed(0)}점 (${payload ? signalLabel(payload.signal) : ""})`,
                        "점수"
                      ];
                    }
                    return [value, name];
                  }}
                  labelFormatter={(_, payload) => {
                    const record = payload?.[0]?.payload as
                      | ChartPoint
                      | undefined;
                    return `시장 마감일: ${record?.marketDate ?? ""}`;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="totalScore"
                  stroke="#0f172a"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
            {data.length === 1 ? (
              <p className="mt-2 text-center text-xs text-slate-500">
                기록이 1개라 추이는 아직 제한적이에요.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
