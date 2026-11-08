import assert from 'node:assert/strict';
import { test } from 'node:test';
import { connectModel, ModelConnectionError } from '../../src/lib/rental-assistant/model';
import { rentalPostError, readRentalJson } from '../../src/lib/rental-request';

test('a production QRent origin can post while foreign origins and oversized input are rejected', async () => {
  function request(origin: string, body: string) {
    return new Request('https://www.qrent.rent/api/rental-assistant/chat', {
      method: 'POST',
      headers: { host: 'www.qrent.rent', origin, 'content-type': 'application/json' },
      body,
    });
  }
  assert.equal(rentalPostError(request('https://www.qrent.rent', '{}')), null);
  assert.equal(rentalPostError(request('https://example.test', '{}'))?.status, 403);
  assert.equal(
    await readRentalJson(request('https://www.qrent.rent', '{"a": "oversize"}'), 8),
    null
  );
});

test('custom model connections reject loopback, credentials, and non-HTTPS services before fetching', async () => {
  for (const baseUrl of [
    'https://127.0.0.1/v1',
    'https://[::1]/v1',
    'https://example.test:9443/v1',
    'https://user:password@example.test/v1',
    'http://example.test/v1',
  ]) {
    await assert.rejects(
      connectModel({ type: 'compatible', baseUrl, apiKey: 'test', model: 'fixture' }),
      ModelConnectionError
    );
  }
});
