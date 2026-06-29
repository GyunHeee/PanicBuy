"use client";

import { useState } from "react";
import { IndicatorGrid } from "./IndicatorGrid";
import { SignalCard, type SignalViewMode } from "./SignalCard";
import type { SignalResult } from "../types";

type SignalDashboardProps = {
  signal: SignalResult | null;
  error: string | null;
};

export function SignalDashboard({ signal, error }: SignalDashboardProps) {
  const [mode, setMode] = useState<SignalViewMode>("beginner");

  return (
    <>
      <SignalCard
        signal={signal}
        error={error}
        onModeChange={setMode}
      />
      <IndicatorGrid signal={signal} mode={mode} />
    </>
  );
}
