import type { SignalResult } from "../types";

type IndicatorGridProps = {
  signal: SignalResult | null;
};

type IndicatorKey =
  | "vix"
  | "rsi"
  | "ma200Deviation"
  | "rate10yChange"
  | "fearGreed";

type IndicatorMeta = {
  label: string;
  description: string;
  standardWeight: number;
  normalizedWeight: number;
};

const INDICATOR_META: Record<IndicatorKey, IndicatorMeta> = {
  vix: {
    label: "VIX",
    description:
      "시장의 공포 정도를 나타내요. 보통 15~20이면 평온한 상태예요.",
    standardWeight: 25,
    normalizedWeight: 27.78
  },
  rsi: {
    label: "RSI",
    description:
      "주가가 단기간에 과도하게 오르거나 내렸는지를 봐요. 30 이하면 많이 빠진 상태예요.",
    standardWeight: 15,
    normalizedWeight: 16.67
  },
  ma200Deviation: {
    label: "200일선 이탈률",
    description:
      "최근 200일 평균 가격과 비교해서 지금이 얼마나 비싸거나 싼지를 봐요.",
    standardWeight: 30,
    normalizedWeight: 33.33
  },
  rate10yChange: {
    label: "10년물 금리변화율",
    description:
      "미국 국채 금리가 최근 한 달간 얼마나 급하게 변했는지를 봐요. 급등하면 주식시장에 부담이에요.",
    standardWeight: 20,
    normalizedWeight: 22.22
  },
  fearGreed: {
    label: "공포탐욕지수",
    description:
      "투자자들의 심리를 종합한 지수예요. 낮으면 공포, 높으면 탐욕 상태예요.",
    standardWeight: 10,
    normalizedWeight: 10
  }
};

function formatNumber(value: number, digits: number = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "데이터 없음";
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function gaugeColorClass(percent: number): string {
  if (percent <= 33) {
    return "bg-green-400";
  }

  if (percent <= 66) {
    return "bg-yellow-400";
  }

  return "bg-red-400";
}

function GaugeBar({
  percent,
  disabled = false
}: {
  percent: number;
  disabled?: boolean;
}) {
  const width = clampPercent(percent);

  return (
    <div className="mt-4">
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${
            disabled ? "bg-slate-300" : gaugeColorClass(width)
          }`}
          style={{ width: `${disabled ? 0 : width}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-400">
        <span>낮음</span>
        <span>높음</span>
      </div>
    </div>
  );
}

export function IndicatorGrid({ signal }: IndicatorGridProps) {
  if (!signal) {
    return null;
  }

  const useNormalizedWeights = signal.rawValues.fearGreed === null;
  const indicators = [
    {
      key: "vix",
      value: formatNumber(signal.rawValues.vix),
      score: signal.scores.vix
    },
    {
      key: "rsi",
      value: formatNumber(signal.rawValues.rsi),
      score: signal.scores.rsi
    },
    {
      key: "ma200Deviation",
      value: `${formatNumber(signal.rawValues.ma200Deviation)}%`,
      score: signal.scores.ma200Deviation
    },
    {
      key: "rate10yChange",
      value: `${formatNumber(signal.rawValues.rate10yChange)}%`,
      score: signal.scores.rate10yChange
    },
    {
      key: "fearGreed",
      value:
        signal.rawValues.fearGreed === null
          ? "데이터를 가져오지 못했어요"
          : formatNumber(signal.rawValues.fearGreed),
      score: signal.scores.fearGreed,
      muted: signal.rawValues.fearGreed === null
    }
  ] satisfies Array<{
    key: IndicatorKey;
    value: string;
    score: number;
    muted?: boolean;
  }>;

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {indicators.map((indicator) => {
        const meta = INDICATOR_META[indicator.key];
        const maxScore =
          useNormalizedWeights && indicator.key !== "fearGreed"
            ? meta.normalizedWeight
            : meta.standardWeight;
        const gaugePercent = (indicator.score / maxScore) * 100;

        return (
          <div
            key={indicator.key}
            className={`flex min-h-64 flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${
              indicator.muted ? "opacity-60" : ""
            }`}
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-500">
                {meta.label}
              </p>
              <p className="mt-1 min-h-16 text-xs leading-5 text-slate-500">
                {meta.description}
              </p>
              <p className="mt-3 text-2xl font-semibold leading-tight text-slate-950">
                {indicator.value}
              </p>
              <p className="mt-3 text-sm text-slate-500">
                환산점수{" "}
                <span className="font-medium text-slate-700">
                  {formatNumber(indicator.score)}
                </span>
              </p>
            </div>
            <GaugeBar percent={gaugePercent} disabled={indicator.muted} />
          </div>
        );
      })}
    </section>
  );
}
