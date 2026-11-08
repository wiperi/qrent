import { z } from 'zod';
import { RENTAL_SCHOOLS } from '../rental-schools';
import { validPreviewRow } from '../rental-preview';
import type { ListingComparison, ListingExample } from './contracts';

const campuses = ['UNSW', 'USYD', 'UTS'] as const;
const suburbs = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[a-z][a-z -]*[a-z]$/i);
export const listingInput = z.object({
  school: z.enum(campuses).optional().describe('Campus code. Omit only if a suburb is specified.'),
  suburbs: z
    .array(suburbs)
    .max(3)
    .optional()
    .describe('Up to three Sydney suburb names in English, e.g. ["Eastgardens", "Randwick"].'),
  minRent: z
    .number()
    .int()
    .positive()
    .max(100000)
    .nullish()
    .describe('Minimum AUD per week. Null clears this filter.'),
  maxRent: z
    .number()
    .int()
    .positive()
    .max(100000)
    .nullish()
    .describe('Maximum AUD per week. Null clears this filter.'),
  bedrooms: z
    .number()
    .int()
    .min(1)
    .max(20)
    .nullish()
    .describe('Exact positive bedroom count. Null clears this filter.'),
  maxCommute: z
    .number()
    .int()
    .min(1)
    .max(180)
    .nullish()
    .describe('Maximum transit minutes. Null clears this filter.'),
});

export type ListingInput = z.infer<typeof listingInput>;

const property = z.object({
  id: z.number().int().positive(),
  address: z.string().min(1),
  region: z.string().min(1),
  price: z.number().positive(),
  bedroomCount: z.number().int().nonnegative(),
  commuteTime: z.number().int().nonnegative().nullable(),
  publishedAt: z.string().datetime({ offset: true }),
  url: z.string().url(),
});
const searchResponse = z.object({
  result: z.object({
    data: z.object({
      filteredCount: z.number().int().nonnegative(),
      averagePrice: z.number().nonnegative(),
      properties: z.array(z.unknown()),
      topRegions: z.array(
        z.object({
          region: z.string().nullable(),
          propertyCount: z.number().int().nonnegative(),
          averagePrice: z.number().nonnegative(),
        })
      ),
    }),
  }),
});

// Preserve explicit weekly caps even when the model omits or changes the number.
const rentCeilings = [
  /(?:周租|每周|周预算)\s*(?:最多|最高|上限(?:为|是)?|不超过|低于)\s*(?:A?\$|AUD)?\s*(\d+(?:,\d{3})*)(?![.\d]|,\d)/i,
  /(?:周租|每周|预算)\s*(?:A?\$|AUD)?\s*(\d+(?:,\d{3})*)\s*(?:澳元|刀|AUD)?\s*(?:以内|以下|封顶)/i,
  /(?:周租|预算)\s*(?:改到|改成|调到|降到|提高到)\s*(?:每周\s*)?(?:A?\$|AUD)?\s*(\d+(?:,\d{3})*)(?![.\d]|,\d)/i,
  /\b(?:under|below|at most|up to|no more than|max(?:imum)?|budget (?:of|is))\s*(?:A?\$\s*|AUD\s+)(\d+(?:,\d{3})*)(?![.\d]|,\d)/i,
  /\b(?:under|below|at most|up to|no more than|max(?:imum)?)\s*(\d+(?:,\d{3})*)\s*(?:AUD|\/w(?:eek|k)|per week)\b/i,
];

export function explicitRentCeiling(question: string) {
  const text = question.normalize('NFKC');
  for (const pattern of rentCeilings) {
    const match = pattern.exec(text);
    if (!match) continue;
    const amount = Number(match[1].replaceAll(',', ''));
    if (Number.isInteger(amount) && amount > 0 && amount <= 100000) return amount;
  }
  return undefined;
}

export function suburbKey(value: string) {
  const key = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, ' ');
  return key === 'sydney city' || key === 'sydney cbd' ? 'sydney' : key;
}

export async function searchListings(input: ListingInput, locale: string, signal: AbortSignal) {
  const areas = [...new Set(input.suburbs?.map(suburbKey))];
  if (
    (!input.school && !areas.length) ||
    (input.minRent && input.maxRent && input.minRent > input.maxRent)
  )
    return { error: 'Provide a Sydney campus or suburb and a valid weekly rent range.' } as const;
  const targets = (areas.length ? areas : [null]).map(suburb => ({
    suburb,
    school:
      input.school ??
      RENTAL_SCHOOLS.find(item => item.areas.some(area => suburbKey(area) === suburb))?.code,
  }));
  const filters = {
    minRent: input.minRent ?? undefined,
    maxRent: input.maxRent ?? undefined,
    bedrooms: input.bedrooms ?? undefined,
    maxCommute: input.maxCommute ?? undefined,
  };
  const regions = await Promise.all(
    targets.map(async ({ school, suburb }) => {
      if (!school) return { suburb, error: 'Ask which campus to use for this suburb.' } as const;
      try {
        return await searchArea(school, suburb, filters, locale, signal);
      } catch {
        return {
          school,
          suburb,
          error: 'QRent property search unavailable. Do not estimate.',
        } as const;
      }
    })
  );
  return { regions };
}

async function searchArea(
  school: ListingComparison['school'],
  suburb: string | null,
  filters: ListingComparison['filters'],
  locale: string,
  signal: AbortSignal
): Promise<ListingComparison> {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.qrent.rent';
  // The legacy API ORs space-delimited prefixes. Use one prefix to fetch candidates and
  // take exact-suburb rows and statistics only. The API also supplies grouped aggregates.
  const prefix = suburb?.split(' ')[0];
  const query = {
    targetSchool: school,
    page: 1,
    pageSize: suburb ? 30 : 6,
    regions: prefix,
    minPrice: filters.minRent,
    maxPrice: filters.maxRent,
    minBedrooms: filters.bedrooms,
    maxBedrooms: filters.bedrooms,
    maxCommuteTime: filters.maxCommute,
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
  };
  const url =
    base.replace(/\/$/, '') +
    '/trpc/properties.search?input=' +
    encodeURIComponent(JSON.stringify(query));
  const response = await fetch(url, {
    headers: { 'x-locale': locale },
    cache: 'no-store',
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
  });
  if (!response.ok) throw new Error('Property API unavailable');
  const {
    result: { data },
  } = searchResponse.parse(await response.json());
  const matchingRows = data.properties
    .map(row => property.safeParse(row))
    .flatMap(row => (row.success && validPreviewRow(row.data) ? [row.data] : []))
    .filter(row => !suburb || suburbKey(row.region) === suburb);
  const exactStats = suburb
    ? data.topRegions.find(region => region.region && suburbKey(region.region) === suburb)
    : undefined;
  const allRegionsRepresented =
    data.topRegions.reduce((sum, region) => sum + region.propertyCount, 0) === data.filteredCount;
  const matches = suburb
    ? (exactStats?.propertyCount ?? (allRegionsRepresented ? 0 : null))
    : data.filteredCount;
  const average = suburb ? exactStats?.averagePrice : data.averagePrice;
  const examples: ListingExample[] = matchingRows.slice(0, 3).map(row => ({
    id: row.id,
    address: row.address,
    region: row.region,
    weeklyRent: row.price,
    bedrooms: row.bedroomCount,
    commuteMinutes: row.commuteTime,
    publishedAt: row.publishedAt,
    url: row.url,
  }));

  return {
    school,
    suburb: exactStats?.region ?? suburb,
    matches,
    averageWeeklyRent: matches && average ? Math.round(average) : null,
    examples,
    readAt: new Date().toISOString(),
    filters,
  };
}
