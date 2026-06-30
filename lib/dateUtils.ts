const DAY_MS = 24 * 60 * 60 * 1000;
const MARKET_DATA_SETTLE_HOUR_ET = 20;

function parseDateUtc(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function getKoreaTodayString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export function getDaysFromKoreaToday(marketDate: string): number {
  const today = parseDateUtc(getKoreaTodayString());
  const target = parseDateUtc(marketDate);

  return Math.round((today.getTime() - target.getTime()) / DAY_MS);
}

function getUtcWeekday(date: string): number {
  return parseDateUtc(date).getUTCDay();
}

function getTimeZoneParts(
  date: Date,
  timeZone: string
): {
  year: number;
  month: number;
  day: number;
  hour: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour === 24 ? 0 : values.hour
  };
}

function formatDateParts({
  year,
  month,
  day
}: {
  year: number;
  month: number;
  day: number;
}): string {
  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function previousWeekday(date: string): string {
  const previous = parseDateUtc(date);

  do {
    previous.setUTCDate(previous.getUTCDate() - 1);
  } while (previous.getUTCDay() === 0 || previous.getUTCDay() === 6);

  return previous.toISOString().slice(0, 10);
}

export function getLatestStableMarketDate(now: Date = new Date()): string {
  const nyNow = getTimeZoneParts(now, "America/New_York");
  const nyDate = formatDateParts(nyNow);
  const weekday = getUtcWeekday(nyDate);

  if (weekday === 0 || weekday === 6) {
    return previousWeekday(nyDate);
  }

  if (nyNow.hour >= MARKET_DATA_SETTLE_HOUR_ET) {
    return nyDate;
  }

  return previousWeekday(nyDate);
}

export function getMostRecentTradingDayLabel(marketDate: string): string {
  const diffDays = getDaysFromKoreaToday(marketDate);

  if (diffDays === 1) {
    return `어제(${marketDate}) 기준`;
  }

  if (diffDays >= 2 && diffDays <= 3 && getUtcWeekday(marketDate) === 5) {
    return `지난 금요일(${marketDate}) 기준`;
  }

  return `${marketDate} 기준`;
}
