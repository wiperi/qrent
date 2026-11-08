import assert from 'node:assert/strict';
import { test } from 'node:test';
import { POST } from '../../src/app/api/rental-assistant/chat/route';

const origin = 'https://www.qrent.rent';
const key = 'sk-fixture-user-secret-123456';
const sessionId = 'e55fdc75-77db-4cee-801b-140bb06359c1';

function rejectedModelRequest(token?: string, legacy = false) {
  return new Request(origin + '/api/rental-assistant/chat', {
    method: 'POST',
    headers: {
      host: 'www.qrent.rent',
      origin,
      'content-type': 'application/json',
      ...(legacy ? {} : { authorization: 'Bearer ' + key }),
      ...(token ? { 'x-vercel-oidc-token': token } : {}),
    },
    body: JSON.stringify({
      locale: 'zh',
      sessionId,
      connection: {
        type: 'compatible',
        baseUrl: 'https://127.0.0.1',
        model: 'fixture',
        ...(legacy ? { apiKey: key } : {}),
      },
      messages: [
        { role: 'user', content: '上一轮已处理' },
        { role: 'user', content: '找 UNSW 两房。' + key + ' renter@example.test' },
      ],
    }),
  });
}

test('production records an accepted question and model failure without storing connection secrets', async t => {
  const writer = t.mock.method(
    globalThis,
    'fetch',
    async (url: string | URL | Request, init?: RequestInit) => {
      assert.equal(String(url), 'https://api.qrent.rent/api/rental-assistant-history');
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer signed-deployment');
      return new Response(null, { status: 204 });
    }
  );
  const previous = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = 'production';
  t.after(() => {
    if (previous === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous;
  });

  const response = await POST(rejectedModelRequest('signed-deployment'));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { code: 'invalid_connection' });
  assert.equal(writer.mock.calls.length, 2);
  const writes = writer.mock.calls.map(call => JSON.parse(String(call.arguments[1]?.body)));
  assert.deepEqual(
    writes.map(write => write.phase),
    ['start', 'finish']
  );
  assert.equal(writes[0].recordId, writes[1].recordId);
  assert.equal(writes[0].sessionId, sessionId);
  assert.equal(writes[0].question, '找 UNSW 两房。[redacted] [redacted]');
  assert.equal(writes[1].outcome.code, 'invalid_connection');
  assert.doesNotMatch(
    JSON.stringify(writes),
    /fixture-user-secret|renter@example|127\.0\.0\.1|上一轮|signed-deployment/
  );

  const missingIdentity = await POST(rejectedModelRequest());
  assert.equal(missingIdentity.status, 503);
  assert.deepEqual(await missingIdentity.json(), { code: 'history_unavailable' });
  assert.equal(writer.mock.calls.length, 2);

  const legacy = await POST(rejectedModelRequest('signed-deployment', true));
  assert.equal(legacy.status, 400);
  assert.equal(writer.mock.calls.length, 4);
});
