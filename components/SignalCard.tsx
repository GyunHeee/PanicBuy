import type { SignalLevel, SignalResult } from "../types";

type SignalCardProps = {
  signal: SignalResult | null;
  error?: string | null;
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

export function SignalCard({ signal, error }: SignalCardProps) {
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

  return (
    <section className={`rounded-lg border p-6 shadow-sm ${meta.className}`}>
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{signal.date}</p>
          <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
            {meta.emoji} {meta.label}
          </h1>
          <p className="mt-3 text-base leading-7">{signal.description}</p>
        </div>
        <div className="shrink-0 rounded-lg bg-white/70 px-5 py-4 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-600">총점</p>
          <p className="mt-1 text-4xl font-semibold text-slate-950">
            {Math.round(signal.totalScore)}
            <span className="text-lg font-medium text-slate-500">/100</span>
          </p>
        </div>
      </div>

      {signal.conditionsMet.length > 0 ? (
        <div className="mt-6 border-t border-current/15 pt-5">
          <p className="text-sm font-semibold">근거:</p>
          <ul className="mt-3 space-y-2 text-sm">
            {signal.conditionsMet.map((condition) => (
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
