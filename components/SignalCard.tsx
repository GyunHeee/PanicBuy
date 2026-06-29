"use client";

import { useEffect, useState } from "react";
import type { SignalLevel, SignalResult } from "../types";

export type SignalViewMode = "beginner" | "expert";

type SignalCardProps = {
  signal: SignalResult | null;
  error?: string | null;
  onModeChange?: (mode: SignalViewMode) => void;
};

const SIGNAL_META: Record<
  SignalLevel,
  {
    emoji: string;
    label: string;
    className: string;
  }
> = {
  caution: {
    emoji: "🔵",
    label: "과열 구간",
    className: "border-blue-300 bg-blue-50 text-blue-950"
  },
  neutral: {
    emoji: "⚪",
    label: "평소",
    className: "border-gray-300 bg-gray-50 text-gray-950"
  },
  watch: {
    emoji: "🟡",
    label: "약한 신호 감지",
    className: "border-yellow-400 bg-yellow-50 text-yellow-950"
  },
  alert: {
    emoji: "🔴",
    label: "강한 신호 감지",
    className: "border-red-400 bg-red-50 text-red-950"
  }
};

const STORAGE_KEY = "panic-buy.signal-view-mode";

function isSignalViewMode(value: string | null): value is SignalViewMode {
  return value === "beginner" || value === "expert";
}

export function SignalCard({
  signal,
  error,
  onModeChange
}: SignalCardProps) {
  const [mode, setMode] = useState<SignalViewMode>("beginner");

  useEffect(() => {
    const savedMode = window.localStorage.getItem(STORAGE_KEY);
    window.setTimeout(() => {
      const nextMode = isSignalViewMode(savedMode) ? savedMode : "beginner";
      setMode(nextMode);
      onModeChange?.(nextMode);
    }, 0);
  }, [onModeChange]);

  function handleModeChange(nextMode: SignalViewMode) {
    setMode(nextMode);
    window.localStorage.setItem(STORAGE_KEY, nextMode);
    onModeChange?.(nextMode);
  }

  if (!signal) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-red-700">
          데이터를 불러오지 못했습니다.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          {error ?? "잠시 후 다시 시도해 주세요."}
        </p>
      </section>
    );
  }

  const meta = SIGNAL_META[signal.signal];
  const isBeginnerMode = mode === "beginner";
  const description = isBeginnerMode
    ? signal.beginnerDescription
    : signal.description;
  const conditionsMet = isBeginnerMode
    ? signal.beginnerConditionsMet
    : signal.conditionsMet;

  return (
    <section className={`rounded-lg border p-6 shadow-sm ${meta.className}`}>
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium opacity-75">{signal.date}</p>
          <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
            {meta.emoji} {meta.label}
          </h1>
          <p className="mt-3 text-base leading-7 transition-opacity duration-200">
            {description}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-3">
          <ModeToggle mode={mode} onModeChange={handleModeChange} />
          <div className="rounded-lg bg-white/70 px-5 py-4 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-600">총점</p>
            <p className="mt-1 text-4xl font-semibold text-slate-950">
              {Math.round(signal.totalScore)}
              <span className="text-lg font-medium text-slate-500">/100</span>
            </p>
          </div>
        </div>
      </div>

      {conditionsMet.length > 0 ? (
        <div className="mt-6 border-t border-current/15 pt-5 transition-opacity duration-200">
          <p className="text-sm font-semibold">근거:</p>
          <ul className="mt-3 space-y-2 text-sm">
            {conditionsMet.map((condition) => (
              <li key={condition} className="rounded-md bg-white/60 px-3 py-2">
                {condition}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function ModeToggle({
  mode,
  onModeChange
}: {
  mode: SignalViewMode;
  onModeChange?: (mode: SignalViewMode) => void;
}) {
  const options: Array<{ mode: SignalViewMode; label: string }> = [
    { mode: "beginner", label: "쉬운 모드" },
    { mode: "expert", label: "전문가 모드" }
  ];

  return (
    <div
      className="inline-flex rounded-md border border-white/70 bg-white/50 p-1 shadow-sm"
      aria-label="설명 모드 선택"
    >
      {options.map((option) => (
        <button
          key={option.mode}
          type="button"
          onClick={() => onModeChange?.(option.mode)}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === option.mode
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-600 hover:text-slate-950"
          }`}
          aria-pressed={mode === option.mode}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
