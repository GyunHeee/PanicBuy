import { NextResponse } from "next/server";
import {
  get10yRateHistory,
  getFearGreedIndex,
  getSpyHistory,
  getVixHistory
} from "../../../lib/dataFetcher";
import {
  alignTimeSeriesByDate,
  calculateMA200Deviation,
  calculateRSI,
  calculateRateChange
} from "../../../lib/indicators";
import { calculateSignal } from "../../../lib/scoring";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function latestFiniteIndex(seriesList: number[][]): number {
  const longestLength = Math.max(...seriesList.map((values) => values.length));

  for (let index = longestLength - 1; index >= 0; index -= 1) {
    if (seriesList.every((values) => Number.isFinite(values[index]))) {
      return index;
    }
  }

  return -1;
}

function finiteBefore(values: number[], index: number): number[] {
  return values.slice(0, index).filter((value) => Number.isFinite(value));
}

export async function GET() {
  try {
    const [vixHistory, spyHistory, rateHistory, fearGreed] = await Promise.all([
      getVixHistory("2y"),
      getSpyHistory("2y"),
      get10yRateHistory(),
      getFearGreedIndex()
    ]);

    const aligned = alignTimeSeriesByDate([vixHistory, spyHistory, rateHistory]);
    const dates = aligned.map((point) => point.date);
    const vixValues = aligned.map((point) => point.values[0]);
    const spyPrices = aligned.map((point) => point.values[1]);
    const rates = aligned.map((point) => point.values[2]);
    const rsiValues = calculateRSI(spyPrices);
    const ma200DeviationValues = calculateMA200Deviation(spyPrices);
    const rateChangeValues = calculateRateChange(rates);

    const latestIndex = latestFiniteIndex([
      vixValues,
      rsiValues,
      ma200DeviationValues,
      rateChangeValues
    ]);

    if (latestIndex < 0) {
      return NextResponse.json(
        { error: "No aligned finite indicator row was available." },
        { status: 500 }
      );
    }

    const marketDate = dates[latestIndex];

    const signal = calculateSignal(
      {
        vix: vixValues[latestIndex],
        rsi: rsiValues[latestIndex],
        ma200Deviation: ma200DeviationValues[latestIndex],
        rate10yChange: rateChangeValues[latestIndex],
        fearGreed
      },
      {
        vixHistory: finiteBefore(vixValues, latestIndex),
        rsiHistory: finiteBefore(rsiValues, latestIndex),
        ma200DevHistory: finiteBefore(ma200DeviationValues, latestIndex),
        rateChangeHistory: finiteBefore(rateChangeValues, latestIndex),
        fearGreedHistory: []
      }
    );

    return NextResponse.json(
      {
        ...signal,
        marketDate
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0"
        }
      }
    );
  } catch (error) {
    console.error("Signal API failed", error);
    return NextResponse.json(
      { error: "Failed to calculate signal" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0"
        }
      }
    );
  }
}
