import { SCHOOL } from '@qrent/shared/enum';
import { RENTAL_SCHOOLS, areaName } from './rental-schools';

export const DEMO_DRAFT_KEY = 'qrent:home-demo:subscription-draft:v1';
export const DEMO_FILTER_KEYS = [
  'university',
  'priceMin',
  'priceMax',
  'commuteMin',
  'commuteMax',
  'bedroomsMin',
  'bedroomsMax',
  'bathroomsMin',
  'bathroomsMax',
  'propertyType',
  'rating',
  'moveInDate',
  'areas',
  'sort',
] as const;
export type DemoFilters = Record<(typeof DEMO_FILTER_KEYS)[number], string>;
export type DemoDraft = {
  version: 1;
  filters: DemoFilters;
  frequency: 'daily';
  durationDays: 30;
  savedAt: string;
};

export function demoFilters(params: Pick<URLSearchParams, 'get'>): DemoFilters {
  const filters = Object.fromEntries(
    DEMO_FILTER_KEYS.map(key => [
      key,
      params.get(key) ?? (key === 'university' ? 'UNSW' : key === 'sort' ? 'recent' : ''),
    ])
  ) as DemoFilters;
  filters.areas = filters.areas
    .split(',')
    .filter(Boolean)
    .map(area => {
      const key = area.trim().replace(/\s+/g, '-');
      return key === 'sydney' ? 'sydney-city' : key;
    })
    .join(',');
  return filters;
}

const numericBounds = {
  priceMin: 1000000,
  priceMax: 1000000,
  commuteMin: 1440,
  commuteMax: 1440,
  bedroomsMin: 255,
  bedroomsMax: 255,
  bathroomsMin: 255,
  bathroomsMax: 255,
  rating: 20,
} as const;

export function validCalendarDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}

export function demoFilterError(
  filters: DemoFilters
): 'school' | 'number' | 'range' | 'date' | 'area' | 'type' | 'sort' | null {
  if (!RENTAL_SCHOOLS.some(school => school.code === filters.university)) return 'school';
  // The legacy API ignores zero upper bounds for price/room counts. Do not issue
  // an apparently restrictive query which the backend would silently broaden.
  if (
    ['priceMax', 'bedroomsMax', 'bathroomsMax'].some(
      key =>
        filters[key as keyof DemoFilters] !== '' && Number(filters[key as keyof DemoFilters]) === 0
    )
  )
    return 'number';
  for (const [key, max] of Object.entries(numericBounds)) {
    const value = filters[key as keyof DemoFilters];
    if (
      value &&
      (!/^\d+(?:\.\d)?$/.test(value) ||
        Number(value) > max ||
        (key !== 'rating' && !Number.isInteger(Number(value))))
    )
      return 'number';
  }
  for (const [min, max] of [
    ['priceMin', 'priceMax'],
    ['commuteMin', 'commuteMax'],
    ['bedroomsMin', 'bedroomsMax'],
    ['bathroomsMin', 'bathroomsMax'],
  ] as const)
    if (filters[min] && filters[max] && Number(filters[min]) > Number(filters[max])) return 'range';
  if (filters.moveInDate && !validCalendarDate(filters.moveInDate)) return 'date';
  if (filters.propertyType && !['1', '2'].includes(filters.propertyType)) return 'type';
  if (!['recent', 'score', 'price'].includes(filters.sort)) return 'sort';
  const areas = filters.areas.split(',').filter(Boolean);
  if (
    areas.length > 30 ||
    areas.some(area => !/^[a-z]+(?:-[a-z]+)*$/.test(area) || area.length > 60)
  )
    return 'area';
  return null;
}

export function demoParams(filters: DemoFilters) {
  const params = new URLSearchParams();
  for (const key of DEMO_FILTER_KEYS) if (filters[key]) params.set(key, filters[key]);
  return params;
}

export function demoErrorMessage(code: ReturnType<typeof demoFilterError>, locale: string) {
  const messages = {
    school: ['请选择 UNSW、USYD 或 UTS。', 'Choose UNSW, USYD or UTS.'],
    number: [
      '最高预算、最多卧室和最多浴室须大于0；使用有效整数，AI评分范围为0–20。',
      'Upper rent/room limits must exceed zero. Use valid integers, or an AI score from 0 to 20.',
    ],
    range: [
      '最小值不能大于最大值，请检查价格、卧浴和通勤范围。',
      'Minimum values cannot exceed maximum values. Check the rent, room and commute ranges.',
    ],
    date: [
      '请输入有效入住日期，例如 2026-11-15。',
      'Enter a valid move-in date, such as 2026-11-15.',
    ],
    area: [
      '区域名称无效，请从区域选项重新选择。',
      'The area name is invalid. Choose an area from the options.',
    ],
    type: ['请选择独栋、公寓或不限房型。', 'Choose House, Apartment or Any type.'],
    sort: [
      '请选择房源日期、AI评分或租金排序。',
      'Choose record date, AI score or weekly rent for sorting.',
    ],
  };
  return messages[code ?? 'number'][locale === 'zh' ? 0 : 1];
}

export function demoSearchInput(filters: DemoFilters) {
  if (demoFilterError(filters)) throw new Error('Invalid preview filters');
  const n = (key: keyof DemoFilters) => (filters[key] ? Number(filters[key]) : undefined);
  return {
    targetSchool: filters.university as SCHOOL,
    page: 1,
    pageSize: 6,
    minPrice: n('priceMin'),
    maxPrice: n('priceMax'),
    minBedrooms: n('bedroomsMin'),
    maxBedrooms: n('bedroomsMax'),
    minBathrooms: n('bathroomsMin'),
    maxBathrooms: n('bathroomsMax'),
    minCommuteTime: n('commuteMin'),
    maxCommuteTime: n('commuteMax'),
    propertyType: n('propertyType'),
    minRating: n('rating'),
    moveInDate: filters.moveInDate ? `${filters.moveInDate}T00:00:00.000Z` : undefined,
    regions: filters.areas
      ? filters.areas.split(',').filter(Boolean).map(regionValue).join(' ')
      : undefined,
    orderBy: demoOrderBy(filters.sort),
  };
}

function regionValue(area: string) {
  return area === 'sydney-city' ? 'sydney' : area.replace(/-/g, ' ');
}

export function demoOrderBy(sort: string) {
  return sort === 'score'
    ? [{ averageScore: 'desc' as const }, { publishedAt: 'desc' as const }]
    : sort === 'price'
      ? [{ price: 'asc' as const }, { publishedAt: 'desc' as const }]
      : [{ publishedAt: 'desc' as const }, { averageScore: 'desc' as const }];
}

export function demoSearchHref(locale: string, filters: DemoFilters) {
  const params = demoParams(filters);
  if (filters.areas) params.set('areas', filters.areas.split(',').map(regionValue).join(','));
  params.set('page', '1');
  return `/${locale}/search?${params}`;
}

export function demoFilterSummary(filters: DemoFilters, locale: string) {
  const zh = locale === 'zh';
  const rows = [filters.university];
  if (filters.areas) rows.push(filters.areas.split(',').map(areaName).join(' / '));
  if (filters.priceMin || filters.priceMax)
    rows.push(
      `AUD ${filters.priceMin || '0'}–${filters.priceMax || (zh ? '不限' : 'any')}${zh ? '/周' : '/week'}`
    );
  if (filters.bedroomsMin || filters.bedroomsMax)
    rows.push(
      filters.bedroomsMin === filters.bedroomsMax
        ? `${filters.bedroomsMin}${zh ? '卧' : ' bedrooms'}`
        : `${filters.bedroomsMin || '0'}–${filters.bedroomsMax || '+'}${zh ? '卧' : ' bedrooms'}`
    );
  if (filters.bathroomsMin || filters.bathroomsMax)
    rows.push(
      `${filters.bathroomsMin || '0'}–${filters.bathroomsMax || '+'}${zh ? '浴' : ' bathrooms'}`
    );
  if (filters.commuteMin || filters.commuteMax)
    rows.push(
      `${filters.commuteMin || '0'}–${filters.commuteMax || '+'}${zh ? '分钟到校' : ' min to campus'}`
    );
  if (filters.propertyType)
    rows.push(filters.propertyType === '1' ? (zh ? '独栋' : 'House') : zh ? '公寓' : 'Apartment');
  if (filters.rating) rows.push(`${zh ? 'AI评分 ≥' : 'AI score ≥'} ${filters.rating}/20`);
  if (filters.moveInDate) rows.push(`${zh ? '入住不晚于' : 'Available by'} ${filters.moveInDate}`);
  return rows;
}

export function readDemoDraft(raw: string | null): DemoDraft | null {
  if (!raw || raw.length > 6000) return null;
  try {
    const d = JSON.parse(raw);
    if (
      d.version !== 1 ||
      d.frequency !== 'daily' ||
      d.durationDays !== 30 ||
      typeof d.savedAt !== 'string' ||
      !Number.isFinite(Date.parse(d.savedAt)) ||
      !d.filters ||
      DEMO_FILTER_KEYS.some(key => typeof d.filters[key] !== 'string')
    )
      return null;
    const filters = demoFilters(new URLSearchParams(d.filters));
    return demoFilterError(filters)
      ? null
      : { version: 1, frequency: 'daily', durationDays: 30, savedAt: d.savedAt, filters };
  } catch {
    return null;
  }
}

export function sydneyDateTime(value: string | number | Date | null | undefined, locale: string) {
  if (value == null || value === '') return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function availabilityLabel(
  value: string | null | undefined,
  locale: string,
  now = new Date()
) {
  const zh = locale === 'zh';
  const day = value?.slice(0, 10) ?? '';
  if (!validCalendarDate(day))
    return { label: zh ? '入住日期待确认' : 'Availability unconfirmed', available: false };
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const date = new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-AU', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${day}T12:00:00Z`));
  return {
    label:
      day <= today
        ? zh
          ? `${date}起（日期已到，待确认）`
          : `From ${date} · confirm with agent`
        : zh
          ? `${date}起可入住`
          : `Available from ${date}`,
    available: day <= today,
  };
}

export function displayRentalAddress(value: string) {
  // Preserve unit separators and numeric street ranges; never infer a unit number.
  let text = value.trim();
  if (!/[\s/]/.test(text) && /[a-z]+-[a-z]+/i.test(text))
    text = text.replace(/-(?=[a-z])/gi, ' ').replace(/(?<=[a-z])-/gi, ' ');
  return text.replace(
    /\b[a-z]+\b/gi,
    word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
}
