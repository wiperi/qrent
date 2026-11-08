import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { test, type TestContext } from 'node:test';
import { POST } from '../../src/app/api/rental-assistant/chat/route';

type Fixture = {
  filters: Record<string, unknown>;
  unavailable?: string[];
  questions: string[];
  previousSearch?: Record<string, unknown>;
};

async function ask(t: TestContext, fixture: Fixture) {
  const queries: Record<string, unknown>[] = [];
  const server = createServer(async (request, response) => {
    const url = new URL(request.url!, 'http://localhost');
    response.setHeader('content-type', 'application/json');
    if (url.pathname === '/trpc/properties.search') {
      const query = JSON.parse(url.searchParams.get('input')!);
      queries.push(query);
      if (fixture.unavailable?.includes(query.regions)) {
        response.writeHead(503).end('{}');
        return;
      }
      response.end(
        JSON.stringify({
          result: {
            data: {
              filteredCount: 5,
              averagePrice: 980,
              properties: [],
              topRegions: [{ region: 'Randwick', propertyCount: 5, averagePrice: 980 }],
            },
          },
        })
      );
      return;
    }
    let text = '';
    for await (const chunk of request) text += chunk;
    const input = JSON.parse(text);
    const tool = input.tool_choice?.function?.name === 'search_listings';
    const message = tool
      ? {
          content: null,
          tool_calls: [
            {
              id: 'fixture-call',
              type: 'function',
              function: { name: 'search_listings', arguments: JSON.stringify(fixture.filters) },
            },
          ],
        }
      : { content: 'Eastgardens currently averages A$789/week.' };
    response.end(
      JSON.stringify({
        id: 'fixture-response',
        model: 'fixture',
        created: 1,
        object: 'chat.completion',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', ...message },
            finish_reason: tool ? 'tool_calls' : 'stop',
          },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      })
    );
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const base = 'http://127.0.0.1:' + address.port;
  const env = {
    NEXT_PUBLIC_BACKEND_URL: base,
    QRENT_LOCAL_MODEL_URL: base + '/v1',
    QRENT_LOCAL_MODEL_NAME: 'fixture',
  };
  const prior = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  t.after(() => {
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    server.close();
  });
  const response = await POST(
    new Request(base + '/api/rental-assistant/chat', {
      method: 'POST',
      headers: {
        host: '127.0.0.1:' + address.port,
        origin: base,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        locale: 'en',
        connection: { type: 'local' },
        messages: fixture.questions.map(content => ({ role: 'user', content })),
        previousSearch: fixture.previousSearch,
      }),
    })
  );
  assert.equal(response.status, 200);
  return { reply: await response.json(), queries };
}

test('a failed rental lookup cannot return a model estimate as current rent', async t => {
  const { reply, queries } = await ask(t, {
    filters: { school: 'UNSW', suburbs: ['Eastgardens'], bedrooms: 2 },
    unavailable: ['eastgardens'],
    questions: ['Find two bedrooms in Eastgardens near UNSW with a weekly rent budget of A$900.'],
  });
  assert.equal(queries.length, 1);
  assert.match(reply.answer, /could not verify.*eastgardens/i);
  assert.doesNotMatch(reply.answer, /789/);
  assert.deepEqual(reply.evidence, []);
});

test('a partial comparison identifies the missing region and preserves verified prices', async t => {
  const { reply } = await ask(t, {
    filters: { school: 'UNSW', suburbs: ['Eastgardens', 'Randwick'], bedrooms: 2 },
    unavailable: ['eastgardens'],
    questions: ['Compare two-bedroom weekly rents in Eastgardens and Randwick near UNSW.'],
  });
  assert.match(reply.answer, /Randwick.*A\$980/);
  assert.deepEqual(reply.search.suburbs, ['Eastgardens', 'Randwick']);
  assert.match(reply.answer, /could not verify.*eastgardens/i);
  assert.doesNotMatch(reply.answer, /789/);
});

test('a lower weekly budget retains the prior area, campus and bedroom filter', async t => {
  const { queries } = await ask(t, {
    filters: { maxRent: 999 },
    questions: ['Find two bedrooms in Randwick near UNSW.', '周租降到 900'],
    previousSearch: { school: 'UNSW', suburbs: ['Randwick'], bedrooms: 2, maxRent: 1200 },
  });
  assert.equal(queries.length, 1);
  assert.equal(queries[0].targetSchool, 'UNSW');
  assert.equal(queries[0].regions, 'randwick');
  assert.equal(queries[0].minBedrooms, 2);
  assert.equal(queries[0].maxBedrooms, 2);
  assert.equal(queries[0].maxPrice, 900);
});
