import type { SignalResult } from "../types";

type IndicatorGridProps = {
  signal: SignalResult | null;
};

function formatNumber(value: number, digits: number = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "데이터 없음";
}

export function IndicatorGrid({ signal }: IndicatorGridProps) {
  if (!signal) {
    return null;
  }

  const indicators = [
    {
      name: "VIX",
      value: formatNumber(signal.rawValues.vix),
      score: signal.scores.vix
    },
    {
      name: "RSI",
      value: formatNumber(signal.rawValues.rsi),
      score: signal.scores.rsi
    },
    {
      name: "200일선 이탈률",
      value: `${formatNumber(signal.rawValues.ma200Deviation)}%`,
      score: signal.scores.ma200Deviation
    },
    {
      name: "10년물 금리변화율",
      value: `${formatNumber(signal.rawValues.rate10yChange)}%`,
      score: signal.scores.rate10yChange
    },
    {
      name: "공포탐욕지수",
      value:
        signal.rawValues.fearGreed === null
          ? "데이터 없음"
          : formatNumber(signal.rawValues.fearGreed),
      score: signal.scores.fearGreed,
      muted: signal.rawValues.fearGreed === null
    }
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {indicators.map((indicator) => (
        <div
          key={indicator.name}
          className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${
            indicator.muted ? "opacity-50" : ""
          }`}
        >
          <p className="text-sm font-medium text-slate-500">{indicator.name}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {indicator.value}
          </p>
          <p className="mt-3 text-sm text-slate-500">
            환산점수{" "}
            <span className="font-medium text-slate-700">
              {formatNumber(indicator.score)}
            </span>
          </p>
        </div>
      ))}
    </section>
  );
}
