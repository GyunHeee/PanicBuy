import { NextResponse } from "next/server";
import { runBacktest } from "../../../lib/backtest";

export async function GET() {
  try {
    console.log("Backtest API: starting 10-year backtest");
    const startedAt = Date.now();
    const result = await runBacktest(10);
    console.log(
      `Backtest API: completed in ${((Date.now() - startedAt) / 1000).toFixed(
        2
      )}s`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Backtest API failed", error);
    return NextResponse.json(
      { error: "Failed to run backtest" },
      { status: 500 }
    );
  }
}
