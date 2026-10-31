import assert from 'node:assert/strict';
import test from 'node:test';
import {
  availabilityLabel,
  demoFilters,
  demoFilterError,
  demoFilterSummary,
  demoParams,
  demoSearchHref,
  demoSearchInput,
  displayRentalAddress,
  readDemoDraft,
  sydneyDateTime,
} from '../../src/lib/home-demo';

test('demo, full search and subscription preserve the same applied conditions and sort', () => {
  const filters = demoFilters(
    new URLSearchParams({
      university: 'USYD',
      priceMin: '500',
      priceMax: '950',
      commuteMin: '5',
      commuteMax: '40',
      bedroomsMin: '2',
      bedroomsMax: '2',
      bathroomsMin: '1',
      bathroomsMax: '2',
      propertyType: '2',
      rating: '16.5',
      areas: 'sydney-city,wolli-creek',
      moveInDate: '2026-11-15',
      sort: 'price',
    })
  );
  assert.equal(demoFilterError(filters), null);
  const input = demoSearchInput(filters);
  assert.equal(input.targetSchool, 'USYD');
  assert.equal(input.maxPrice, 950);
  assert.equal(input.minBedrooms, 2);
  assert.equal(input.maxBedrooms, 2);
  assert.equal(input.minBathrooms, 1);
  assert.equal(input.maxBathrooms, 2);
  assert.equal(input.maxCommuteTime, 40);
  assert.equal(input.minRating, 16.5);
  assert.equal(input.regions, 'sydney wolli creek');
  assert.equal(input.moveInDate, '2026-11-15T00:00:00.000Z');
  assert.deepEqual(input.orderBy[0], { price: 'asc' });
  const href = new URL(demoSearchHref('en', filters), 'https://www.qrent.rent');
  assert.equal(href.searchParams.get('areas'), 'sydney,wolli creek');
  assert.equal(href.searchParams.get('sort'), 'price');
  assert.deepEqual(demoFilters(href.searchParams), filters);
  assert.deepEqual(demoFilters(demoParams(filters)), filters);
  const summary = demoFilterSummary(filters, 'zh').join(' ');
  for (const term of ['950', '40', '2卧', '16.5', '2026-11-15', 'Wolli Creek'])
    assert(summary.includes(term), term);
});

test('invalid and silently broadened zero-bound queries are rejected before sending', () => {
  const base = demoFilters(new URLSearchParams());
  for (const update of [
    { university: 'Melbourne' },
    { priceMax: '-1' },
    { priceMax: '0' },
    { priceMax: '0.0' },
    { bedroomsMax: '0' },
    { bathroomsMax: '0' },
    { priceMax: '1e8' },
    { rating: '21' },
    { priceMin: '1000', priceMax: '500' },
    { bedroomsMin: '3', bedroomsMax: '2' },
    { moveInDate: '2026-02-30' },
    { areas: '<script>' },
    { propertyType: '99' },
    { sort: 'random' },
  ]) {
    const filters = { ...base, ...update };
    assert(demoFilterError(filters), JSON.stringify(update));
    assert.throws(() => demoSearchInput(filters));
  }
  assert.equal(demoFilterError({ ...base, priceMin: '0' }), null);
});

test('a stored alert is a versioned browser-only draft, not an activated subscription', () => {
  const filters = demoFilters(
    new URLSearchParams({ university: 'UTS', areas: 'surry hills', sort: 'score' })
  );
  const draft = {
    version: 1,
    filters,
    frequency: 'daily',
    durationDays: 30,
    savedAt: '2026-10-31T04:00:00Z',
  };
  assert.deepEqual(readDemoDraft(JSON.stringify(draft)), draft);
  assert.equal(demoSearchInput(filters).regions, 'surry hills');
  assert.deepEqual(demoSearchInput(filters).orderBy[0], { averageScore: 'desc' });
  for (const update of [
    { version: 2 },
    { durationDays: 365 },
    { frequency: 'hourly' },
    { savedAt: 'invalid' },
    { filters: { ...filters, priceMax: '-1' } },
    { filters: { university: 'UTS' } },
  ])
    assert.equal(readDemoDraft(JSON.stringify({ ...draft, ...update })), null);
  assert.equal(readDemoDraft('{broken'), null);
  assert.equal(readDemoDraft(null), null);
  assert.equal('active' in readDemoDraft(JSON.stringify(draft))!, false);
});

test('availability uses the advertised calendar date and Sydney today without inventing availability', () => {
  const now = new Date('2026-10-31T14:30:00Z'); // 1 November in Sydney, still October in UTC.
  assert.equal(availabilityLabel('2026-11-01T00:00:00Z', 'en', now).available, true);
  assert.match(availabilityLabel('2026-11-01T00:00:00Z', 'en', now).label, /confirm with agent/);
  assert.match(availabilityLabel('2026-11-01T00:00:00Z', 'en', now).label, /1 Nov 2026/);
  assert.equal(availabilityLabel('2026-11-02T00:00:00Z', 'zh', now).available, false);
  assert.match(availabilityLabel('2027-01-10T00:00:00Z', 'en', now).label, /2027/);
  for (const date of [null, 'invalid', '2026-02-30'])
    assert.match(availabilityLabel(date, 'en', now).label, /unconfirmed/);
  assert.match(sydneyDateTime('2026-10-31T14:30:00Z', 'en')!, /1 Nov 2026/);
  assert.equal(sydneyDateTime('invalid', 'zh'), null);
});

test('display preserves full unit numbers and numeric street ranges', () => {
  assert.equal(displayRentalAddress('302/713 Elizabeth Street'), '302/713 Elizabeth Street');
  assert.equal(displayRentalAddress('10-12 Bunnerong Road'), '10-12 Bunnerong Road');
  assert.equal(displayRentalAddress('1A/10-12 Bunnerong Road'), '1A/10-12 Bunnerong Road');
  assert.equal(displayRentalAddress('B-12/713 Elizabeth Street'), 'B-12/713 Elizabeth Street');
  assert.equal(displayRentalAddress('1A-3/10 Bunnerong Road'), '1A-3/10 Bunnerong Road');
  assert.equal(displayRentalAddress('159-union-street'), '159 Union Street');
});
