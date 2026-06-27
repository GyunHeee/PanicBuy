import { getSpyHistory } from "../lib/dataFetcher.ts";
import {
  calculateMA200Deviation,
  calculateRSI,
  percentileRank
} from "../lib/indicators.ts";

function lastFinite(values: number[], count: number): number[] {
  return values.filter((value) => Number.isFinite(value)).slice(-count);
}

async function run() {
  const spy = await getSpyHistory("2y");
  const prices = spy.map((point) => point.value);
  const rsi = calculateRSI(prices);
  const ma200Deviation = calculateMA200Deviation(prices);
  const sampleRank = percentileRank(42, [10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);

  const lastRsi = lastFinite(rsi, 5);
  const lastMa200Deviation = lastFinite(ma200Deviation, 5);

  console.log("SPY data points", prices.length);
  console.log("RSI last 5", lastRsi);
  console.log("MA200 deviation last 5 (%)", lastMa200Deviation);
  console.log("Sample percentile rank", sampleRank);
  console.log(
    "RSI range check",
    lastRsi.every((value) => value >= 0 && value <= 100)
  );
  console.log(
    "MA200 deviation sanity check",
    lastMa200Deviation.every((value) => Math.abs(value) < 100)
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
