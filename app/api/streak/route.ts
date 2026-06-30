import { NextResponse } from "next/server";
import { calculateStreak } from "../../../lib/scoreHistory";
import type { StreakInfo } from "../../../types";

const EMPTY_STREAK: StreakInfo = {
  currentSignal: "neutral",
  streakDays: 0,
  previousSignal: null,
  changedToday: false
};

export async function GET() {
  try {
    const streak = await calculateStreak();
    return NextResponse.json(streak);
  } catch (error) {
    console.warn("Streak API returned empty streak", error);
    return NextResponse.json(EMPTY_STREAK);
  }
}
