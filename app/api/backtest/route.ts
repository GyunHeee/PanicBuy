import { NextResponse } from "next/server";
import { runBacktest } from "../../../lib/backtest";

function parseYears(value: string | null): 10 | 20 {
  return value === "10" ? 10 : 20;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const years = parseYears(searchParams.get("years"));
    console.log(`Backtest API: starting ${years}-year backtest`);
    const startedAt = Date.now();
    const result = await runBacktest(years);
    console.log(
      `Backtest API: completed in ${((Date.now() - startedAt) / 1000).toFixed(
        2
      )}s (${years}y)`
    );

    return NextResponse.json({
      years,
      results: result
    });
  } catch (error) {
    console.error("Backtest API failed", error);
    return NextResponse.json(
      { error: "Failed to run backtest" },
      { status: 500 }
    );
  }
}
