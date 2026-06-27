import yahooFinance from "yahoo-finance2";

export type TimeSeriesPoint = { date: string; value: number };

type Period = "2y" | "10y";
type YahooHistoricalRow = {
  date?: Date | string;
  close?: number | null;
};
type YahooHistoricalClient = {
  historical?: (
    symbol: string,
    queryOptions: {
      period1: Date;
      period2: Date;
      interval: "1d";
    }
  ) => Promise<YahooHistoricalRow[]>;
};
type FredObservation = {
  date?: unknown;
  value?: unknown;
};

const yahooClient = yahooFinance as YahooHistoricalClient;

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function yearsAgo(years: number): Date {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date;
}

function periodToYears(period: Period): number {
  return period === "2y" ? 2 : 10;
}

function sortAscending(points: TimeSeriesPoint[]): TimeSeriesPoint[] {
  return [...points].sort((a, b) => a.date.localeCompare(b.date));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toYahooPoint(row: YahooHistoricalRow): TimeSeriesPoint | null {
  if (row.close === null || row.close === undefined) {
    return null;
  }

  const date =
    row.date instanceof Date
      ? formatDate(row.date)
      : typeof row.date === "string"
        ? row.date.slice(0, 10)
        : null;

  if (!date || !Number.isFinite(row.close)) {
    return null;
  }

  return { date, value: row.close };
}

async function getYahooHistory(
  symbol: "^VIX" | "SPY",
  period: Period
): Promise<TimeSeriesPoint[]> {
  const period2 = new Date();
  const period1 = yearsAgo(periodToYears(period));

  try {
    if (typeof yahooClient.historical === "function") {
      const rows = await yahooClient.historical(symbol, {
        period1,
        period2,
        interval: "1d"
      });
      const points = rows
        .map(toYahooPoint)
        .filter((point): point is TimeSeriesPoint => point !== null);

      if (points.length > 0) {
        return sortAscending(points);
      }
    }
  } catch (error) {
    throw new Error(
      `Yahoo Finance ${symbol} historical request failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return getYahooChartHistory(symbol, period1, period2);
}

async function getYahooChartHistory(
  symbol: "^VIX" | "SPY",
  period1: Date,
  period2: Date
): Promise<TimeSeriesPoint[]> {
  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
  );
  url.searchParams.set(
    "period1",
    Math.floor(period1.getTime() / 1000).toString()
  );
  url.searchParams.set(
    "period2",
    Math.floor(period2.getTime() / 1000).toString()
  );
  url.searchParams.set("interval", "1d");
  url.searchParams.set("events", "history");

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(
      `Yahoo Finance ${symbol} chart request failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Yahoo Finance ${symbol} chart request failed with HTTP ${response.status}`
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(
      `Yahoo Finance ${symbol} chart response parsing failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const points = parseYahooChartPayload(payload);
  if (points.length === 0) {
    throw new Error(`Yahoo Finance ${symbol} chart response had no close data`);
  }

  return sortAscending(points);
}

function parseYahooChartPayload(payload: unknown): TimeSeriesPoint[] {
  if (!isRecord(payload) || !isRecord(payload.chart)) {
    return [];
  }

  const result = payload.chart.result;
  if (!Array.isArray(result) || !isRecord(result[0])) {
    return [];
  }

  const timestamps = result[0].timestamp;
  const indicators = result[0].indicators;
  if (!Array.isArray(timestamps) || !isRecord(indicators)) {
    return [];
  }

  const quote = indicators.quote;
  if (!Array.isArray(quote) || !isRecord(quote[0]) || !Array.isArray(quote[0].close)) {
    return [];
  }

  return timestamps.flatMap((timestamp, index) => {
    const close = quote[0].close[index];
    if (typeof timestamp !== "number" || typeof close !== "number") {
      return [];
    }

    return [
      {
        date: formatDate(new Date(timestamp * 1000)),
        value: close
      }
    ];
  });
}

// Returns daily VIX close history sorted from oldest to newest.
export async function getVixHistory(
  period: "2y" | "10y"
): Promise<TimeSeriesPoint[]> {
  return getYahooHistory("^VIX", period);
}

// Returns daily SPY close history sorted from oldest to newest.
export async function getSpyHistory(
  period: "2y" | "10y"
): Promise<TimeSeriesPoint[]> {
  return getYahooHistory("SPY", period);
}

// Returns 10 years of FRED DGS10 values sorted from oldest to newest.
export async function get10yRateHistory(): Promise<TimeSeriesPoint[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    throw new Error("FRED_API_KEY is required to fetch DGS10 history");
  }

  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", "DGS10");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("observation_start", formatDate(yearsAgo(10)));

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(
      `FRED DGS10 request failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!response.ok) {
    throw new Error(`FRED DGS10 request failed with HTTP ${response.status}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(
      `FRED DGS10 response parsing failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!isRecord(payload) || !Array.isArray(payload.observations)) {
    throw new Error("FRED DGS10 response parsing failed: observations missing");
  }

  let lastValidValue: number | null = null;
  const points = (payload.observations as FredObservation[]).flatMap(
    (observation) => {
      if (typeof observation.date !== "string") {
        return [];
      }

      const parsedValue = parseNumber(observation.value);
      if (parsedValue !== null) {
        lastValidValue = parsedValue;
      }

      if (lastValidValue === null) {
        return [];
      }

      return [{ date: observation.date, value: lastValidValue }];
    }
  );

  return sortAscending(points);
}

// Returns today's CNN Fear & Greed score, or null when unavailable.
export async function getFearGreedIndex(): Promise<number | null> {
  let response: Response;
  try {
    response = await fetch(
      "https://production.dataviz.cnn.io/index/fearandgreed/graphdata",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        }
      }
    );
  } catch (error) {
    console.warn(
      `CNN Fear & Greed request failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }

  if (!response.ok) {
    console.warn(
      `CNN Fear & Greed request failed with HTTP ${response.status}`
    );
    return null;
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    console.warn(
      `CNN Fear & Greed response parsing failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }

  return parseFearGreedPayload(payload);
}

function parseFearGreedPayload(payload: unknown): number | null {
  if (!isRecord(payload)) {
    console.warn("CNN Fear & Greed response parsing failed: root is invalid");
    return null;
  }

  const fearAndGreed = payload.fear_and_greed;
  if (isRecord(fearAndGreed)) {
    const score = parseNumber(fearAndGreed.score);
    if (score !== null) {
      return score;
    }
  }

  const score = parseNumber(payload.score);
  if (score !== null) {
    return score;
  }

  console.warn("CNN Fear & Greed response parsing failed: score missing");
  return null;
}
