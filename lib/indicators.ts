import { quantileRank } from "simple-statistics";
import { RSI, SMA } from "technicalindicators";
import type { TimeSeriesPoint } from "./dataFetcher";

type AlignedPoint = { date: string; values: number[] };

function padLeadingNaN(values: number[], targetLength: number): number[] {
  return [
    ...Array.from({ length: Math.max(targetLength - values.length, 0) }, () =>
      Number.NaN
    ),
    ...values
  ].slice(-targetLength);
}

function finiteValues(values: number[]): number[] {
  return values.filter((value) => Number.isFinite(value));
}

// Returns RSI values aligned to the input price index; warm-up rows are NaN.
export function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsiValues = RSI.calculate({ values: prices, period });
  return padLeadingNaN(rsiValues, prices.length);
}

// Returns 200-day SMA deviation percentages aligned to input prices; warm-up rows are NaN.
export function calculateMA200Deviation(prices: number[]): number[] {
  const maValues = SMA.calculate({ values: prices, period: 200 });
  const alignedMA = padLeadingNaN(maValues, prices.length);

  return prices.map((price, index) => {
    const ma = alignedMA[index];
    if (!Number.isFinite(price) || !Number.isFinite(ma) || ma === 0) {
      return Number.NaN;
    }

    return ((price - ma) / ma) * 100;
  });
}

// Returns N-day rate changes in percent; the first lookbackDays rows are NaN.
export function calculateRateChange(
  rates: number[],
  lookbackDays: number = 21
): number[] {
  return rates.map((rate, index) => {
    if (index < lookbackDays) {
      return Number.NaN;
    }

    const previousRate = rates[index - lookbackDays];
    if (
      !Number.isFinite(rate) ||
      !Number.isFinite(previousRate) ||
      previousRate === 0
    ) {
      return Number.NaN;
    }

    return ((rate - previousRate) / previousRate) * 100;
  });
}

/**
 * Returns currentValue's percentile rank in historicalValues as 0~100.
 *
 * Look-ahead bias warning: callers must pass only values available before the
 * current decision point. This function only calculates the rank and does not
 * decide how historicalValues should be sliced.
 */
export function percentileRank(
  currentValue: number,
  historicalValues: number[]
): number {
  const cleanValues = finiteValues(historicalValues);
  if (!Number.isFinite(currentValue) || cleanValues.length < 10) {
    console.warn(
      "percentileRank defaulted to 50 because historicalValues had fewer than 10 valid values or currentValue was invalid."
    );
    return 50;
  }

  return quantileRank(cleanValues, currentValue) * 100;
}

// Aligns multiple date-sorted series by forward-filling prior known values.
export function alignTimeSeriesByDate(
  seriesList: TimeSeriesPoint[][]
): AlignedPoint[] {
  if (seriesList.length === 0) {
    return [];
  }

  const sortedSeries = seriesList.map((series) =>
    [...series].sort((a, b) => a.date.localeCompare(b.date))
  );
  const allDates = Array.from(
    new Set(sortedSeries.flatMap((series) => series.map((point) => point.date)))
  ).sort((a, b) => a.localeCompare(b));

  const indexes = Array.from({ length: sortedSeries.length }, () => 0);
  const lastValues = Array.from({ length: sortedSeries.length }, () =>
    Number.NaN
  );

  return allDates.flatMap((date) => {
    sortedSeries.forEach((series, seriesIndex) => {
      while (
        indexes[seriesIndex] < series.length &&
        series[indexes[seriesIndex]].date <= date
      ) {
        lastValues[seriesIndex] = series[indexes[seriesIndex]].value;
        indexes[seriesIndex] += 1;
      }
    });

    if (lastValues.some((value) => !Number.isFinite(value))) {
      return [];
    }

    return [{ date, values: [...lastValues] }];
  });
}
