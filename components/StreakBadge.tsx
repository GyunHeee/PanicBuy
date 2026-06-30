"use client";

import { useEffect, useState } from "react";
import type { SignalLevel, StreakInfo } from "../types";

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
    className: "bg-blue-100 text-blue-900 ring-blue-200"
  },
  neutral: {
    emoji: "⚪",
    label: "평소",
    className: "bg-slate-100 text-slate-800 ring-slate-200"
  },
  watch: {
    emoji: "🟡",
    label: "약한 신호 감지",
    className: "bg-yellow-100 text-yellow-900 ring-yellow-200"
  },
  alert: {
    emoji: "🔴",
    label: "강한 신호 감지",
    className: "bg-red-100 text-red-900 ring-red-200"
  }
};

function isStreakInfo(value: unknown): value is StreakInfo {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const streak = value as Partial<StreakInfo>;
  return (
    typeof streak.currentSignal === "string" &&
    typeof streak.streakDays === "number" &&
    typeof streak.changedToday === "boolean"
  );
}

export function StreakBadge() {
  const [streak, setStreak] = useState<StreakInfo | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStreak() {
      try {
        const response = await fetch("/api/streak");
        if (!response.ok) {
          return;
        }

        const result = await response.json();
        if (isMounted && isStreakInfo(result)) {
          setStreak(result);
        }
      } catch {
        if (isMounted) {
          setStreak(null);
        }
      }
    }

    loadStreak();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!streak || streak.streakDays <= 0) {
    return null;
  }

  const currentMeta = SIGNAL_META[streak.currentSignal];
  const previousMeta = streak.previousSignal
    ? SIGNAL_META[streak.previousSignal]
    : null;

  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${currentMeta.className}`}
      >
        {currentMeta.emoji} {currentMeta.label} {streak.streakDays}일째
      </span>
      {streak.streakDays === 1 &&
      streak.changedToday &&
      previousMeta !== null ? (
        <span className="text-xs text-slate-500">
          방금 {previousMeta.label}에서 바뀜
        </span>
      ) : null}
    </div>
  );
}
