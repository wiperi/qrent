import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyBackend } from './verify_backend.mjs';

const latest = { id: 1, publishedAt: '2026-10-30T01:00:00Z', averageScore: 14 };
const older = { id: 2, publishedAt: '2026-05-13T01:00:00Z', averageScore: 19 };
const response = rows => async url => ({
  ok: true,
  json: async () => ({ result: { data: { properties: rows } } }),
});
test('verifies every school and the existing Eastgardens request shape', async () => {
  const calls = [];
  const result = await verifyBackend('http://local', async url => {
    calls.push(url);
    return response([latest, older])(url);
  });
  assert.equal(result.checks.length, 4);
  for (const url of calls.slice(1)) {
    const input = JSON.parse(new URL(url).searchParams.get('input'));
    assert.equal(input.pageSize, 12);
    assert.ok(input.orderBy.length === 1 || input.orderBy.length === 2);
  }
  assert.equal(calls.filter(url => url.includes('publishedAt')).length, 4);
});
test('rejects the old score-first order', async () => {
  await assert.rejects(verifyBackend('http://local', response([older, latest])), /date then score/);
});
test('rejects invalid dates and incorrect score tie ordering', async () => {
  await assert.rejects(verifyBackend('http://local', response([{ ...latest, publishedAt: 'unknown' }])), /Invalid/);
  await assert.rejects(verifyBackend('http://local', response([latest, { ...latest, averageScore: 18 }])), /date then score/);
});
test('rejects unavailable or empty responses', async () => {
  await assert.rejects(verifyBackend('http://local', async () => ({ ok: false })), /echo/);
  await assert.rejects(verifyBackend('http://local', response([])), /no verified results/);
});
test('rejects an internally sorted score-selected page that omits a newer property', async () => {
  await assert.rejects(verifyBackend('http://local', async url => {
    const rows = url.includes('publishedAt') ? [latest] : [older];
    return response(rows)(url);
  }), /latest page/);
});
test('rollback checks DB-backed search without requiring the new date ordering', async () => {
  const result = await verifyBackend('http://local', response([older, latest]), { checkLatest: false });
  assert.equal(result.status, 'verified');
  await assert.rejects(verifyBackend('http://local', async url => ({ ok: url.endsWith('/echo') }),
    { checkLatest: false }), /search failed/);
});
