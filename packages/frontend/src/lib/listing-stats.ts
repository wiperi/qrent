export interface ListingStatsSnapshot {
  date: string;
  generatedAt: string;
  newToday: number;
  updatedToday: number;
  currentListings: number;
}

const sydneyDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Australia/Sydney',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function readListingStats(value: unknown, now = new Date()): ListingStatsSnapshot | null {
  if (value === null || typeof value !== 'object') return null;

  const { date, generatedAt, newToday, updatedToday, currentListings } =
    value as Partial<ListingStatsSnapshot>;
  if (
    date !== sydneyDay.format(now) ||
    typeof generatedAt !== 'string' ||
    typeof newToday !== 'number' ||
    typeof updatedToday !== 'number' ||
    typeof currentListings !== 'number' ||
    !Number.isSafeInteger(newToday) ||
    !Number.isSafeInteger(updatedToday) ||
    !Number.isSafeInteger(currentListings) ||
    newToday < 0 ||
    updatedToday < newToday ||
    currentListings < updatedToday
  ) {
    return null;
  }

  const generated = new Date(generatedAt);
  const age = now.getTime() - generated.getTime();
  if (
    !Number.isFinite(age) ||
    age < -30_000 ||
    age > 6 * 60_000 ||
    sydneyDay.format(generated) !== date
  ) {
    return null;
  }

  return { date, generatedAt, newToday, updatedToday, currentListings };
}
