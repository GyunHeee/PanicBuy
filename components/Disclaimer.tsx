type DisclaimerProps = {
  compact?: boolean;
};

export function Disclaimer({ compact = false }: DisclaimerProps) {
  if (compact) {
    return (
      <p className="text-sm text-slate-500">
        이 정보는 투자 조언이 아닌 참고용 지표입니다.
      </p>
    );
  }

  return (
    <div className="sticky top-0 z-50 w-full border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-950 shadow-sm">
      <div className="mx-auto w-full max-w-6xl whitespace-normal break-keep">
        ⚠️ 이 서비스는 투자 조언이 아닌 참고용 지표 정보를 제공합니다. 실제
        투자 판단과 책임은 본인에게 있습니다.
      </div>
    </div>
  );
}
