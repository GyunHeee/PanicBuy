import { NextResponse } from "next/server";
import { getScoreHistory } from "../../../lib/scoreHistory";

function parseDays(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 90;
  }

  return Math.max(1, Math.min(3650, Math.floor(parsed)));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseDays(searchParams.get("days"));
    const history = await getScoreHistory(days);

    return NextResponse.json(history);
  } catch (error) {
    console.warn("Score history API returned empty history", error);
    return NextResponse.json([]);
  }
}
