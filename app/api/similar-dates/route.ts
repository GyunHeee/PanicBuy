import { NextResponse } from "next/server";
import { findSimilarPastDates } from "../../../lib/scoreHistory";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const score = Number(searchParams.get("score"));

    if (!Number.isFinite(score)) {
      return NextResponse.json(
        { error: "score query parameter is required" },
        { status: 400 }
      );
    }

    const records = await findSimilarPastDates(score);
    return NextResponse.json(records);
  } catch (error) {
    console.warn("Similar dates API returned empty history", error);
    return NextResponse.json([]);
  }
}
