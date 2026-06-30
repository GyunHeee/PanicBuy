import { NextResponse } from "next/server";
import { backfillMissingDailyScores } from "../../../lib/scoreBackfill";
import { getScoreHistory } from "../../../lib/scoreHistory";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0"
};

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
    const backfill = await backfillMissingDailyScores(days);
    if (backfill.checked > 0) {
      console.info(
        `Score history backfill checked ${backfill.checked} trading days and saved ${backfill.saved} missing records.`
      );
    }

    const history = await getScoreHistory(days);

    return NextResponse.json(history, {
      headers: NO_STORE_HEADERS
    });
  } catch (error) {
    console.warn("Score history API returned empty history", error);
    return NextResponse.json([], {
      headers: NO_STORE_HEADERS
    });
  }
}
