import assert from 'node:assert/strict';
import test from 'node:test';
import { readListingStats } from '../../src/lib/listing-stats';

test('the Sydney day rolls over without carrying the previous update count into today', () => {
  const yesterday = {
    date: '2026-11-13',
    generatedAt: '2026-11-13T12:59:30Z',
    updatedToday: 1249,
    currentListings: 6665,
  };
  const today = {
    ...yesterday,
    date: '2026-11-14',
    generatedAt: '2026-11-13T13:00:00Z',
    updatedToday: 0,
  };
  assert.deepEqual(readListingStats(yesterday, new Date('2026-11-13T12:59:59Z')), yesterday);
  assert.equal(readListingStats(yesterday, new Date('2026-11-13T13:00:00Z')), null);
  assert.deepEqual(readListingStats(today, new Date('2026-11-13T13:00:05Z')), today);
  assert.equal(readListingStats(today, new Date('2026-11-13T13:10:00Z')), null);
  assert.equal(
    readListingStats({ ...today, updatedToday: 6666 }, new Date('2026-11-13T13:00:05Z')),
    null
  );
});
