import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { test, type TestContext } from 'node:test';
import { POST } from '../../src/app/api/rental-assistant/chat/route';

type Fixture = {
  filters?: Record<string, unknown>;
  steps?: { name: 'search_listings' | 'search_guides'; arguments: Record<string, unknown> }[];
  locale?: 'zh' | 'en';
  unavailable?: string[];
  questions: string[];
  previousSearch?: Record<string, unknown>;
};

async function ask(t: TestContext, fixture: Fixture) {
  const queries: Record<string, unknown>[] = [];
  const modelRequests: Record<string, unknown>[] = [];
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
      const rent = Math.min(980, query.maxPrice ?? Infinity);
      const region = query.regions
        ? query.regions[0].toUpperCase() + query.regions.slice(1)
        : 'Randwick';
      response.end(
        JSON.stringify({
          result: {
            data: {
              filteredCount: 5,
              averagePrice: rent,
              properties: [],
              topRegions: [{ region, propertyCount: 5, averagePrice: rent }],
            },
          },
        })
      );
      return;
    }
    let text = '';
    for await (const chunk of request) text += chunk;
    const input = JSON.parse(text);
    const index = modelRequests.push(input) - 1;
    const step =
      fixture.steps?.[index] ??
      (fixture.filters &&
      input.tool_choice === 'auto' &&
      input.tools?.[0]?.function?.name === 'search_listings'
        ? { name: 'search_listings', arguments: fixture.filters }
        : undefined);
    if (step) {
      assert.notEqual(input.tool_choice, 'none');
      assert.ok(
        input.tools?.some(
          (tool: { function: { name: string } }) => tool.function.name === step.name
        )
      );
    }
    const message = step
      ? {
          content: null,
          tool_calls: [
            {
              id: 'fixture-call-' + index,
              type: 'function',
              function: { name: step.name, arguments: JSON.stringify(step.arguments) },
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
            finish_reason: step ? 'tool_calls' : 'stop',
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
        locale: fixture.locale ?? 'en',
        connection: { type: 'local' },
        messages: fixture.questions.map(content => ({ role: 'user', content })),
        previousSearch: fixture.previousSearch,
      }),
    })
  );
  assert.equal(response.status, 200);
  return { reply: await response.json(), queries, modelRequests };
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

test('one per-person budget sends separate whole-property caps for 2B and 3B', async t => {
  const { reply, queries } = await ask(t, {
    filters: { school: 'UNSW', bedrooms: 2, maxRent: 500 },
    questions: ['UNSW 附近每人每周 500 刀，2B 和 3B 都看看。'],
    locale: 'zh',
  });
  assert.deepEqual(
    queries.map(query => [query.minBedrooms, query.maxBedrooms, query.maxPrice]),
    [
      [2, 2, 1000],
      [3, 3, 1500],
    ]
  );
  assert.match(reply.answer, /2 房.*A\$1,000/);
  assert.match(reply.answer, /3 房.*A\$1,500/);
  assert.match(reply.answer, /一人一间卧室/);
  assert.doesNotMatch(reply.answer, /789/);
  assert.equal(reply.search.perPersonRent, 500);
  assert.deepEqual(reply.search.bedroomOptions, [2, 3]);
});

test('an actual headcount overrides the bedrooms and a tighter whole-property cap wins', async t => {
  const { reply, queries } = await ask(t, {
    filters: { school: 'UNSW', maxRent: 2000, occupants: 3 },
    questions: ['UNSW 附近找 3B，我们两个人，人均 A$500，整套不超过 A$900。'],
    locale: 'zh',
  });
  assert.deepEqual(
    queries.map(query => [query.minBedrooms, query.maxPrice]),
    [[3, 900]]
  );
  assert.doesNotMatch(reply.answer, /一人一间卧室/);
  assert.match(reply.answer, /2 人均分/);
});

test('a follow-up recomputes the cap and carries forward budget basis, campus and commute', async t => {
  const { reply, queries } = await ask(t, {
    filters: { maxRent: 9000, maxCommute: null, occupants: 2 },
    previousSearch: {
      school: 'UNSW',
      suburbs: ['Randwick'],
      bedrooms: 2,
      perPersonRent: 500,
      maxCommute: 30,
    },
    questions: ['那 3B 呢？'],
    locale: 'zh',
  });
  assert.deepEqual(
    queries.map(query => [
      query.targetSchool,
      query.regions,
      query.minBedrooms,
      query.maxPrice,
      query.maxCommuteTime,
    ]),
    [['UNSW', 'randwick', 3, 1500, 30]]
  );
  assert.equal(reply.search.perPersonRent, 500);
});

test('the agent uses tool results to make another distinct search and suppresses duplicates', async t => {
  const { reply, queries, modelRequests } = await ask(t, {
    questions: ['Find two bedrooms under A$1,000 near UNSW. If needed, check nearby suburbs.'],
    steps: [
      { name: 'search_listings', arguments: { suburbs: ['Eastgardens'] } },
      { name: 'search_listings', arguments: { suburbs: ['Randwick'], bedrooms: 3, maxRent: 1200 } },
      { name: 'search_listings', arguments: { suburbs: ['randwick'], maxRent: 1600 } },
    ],
  });
  assert.equal(modelRequests.length, 4);
  assert.deepEqual(
    queries.map(query => [query.regions, query.minBedrooms, query.maxPrice]),
    [
      ['eastgardens', 2, 1000],
      ['randwick', 2, 1000],
    ]
  );
  assert.equal(reply.evidence.length, 2);
  assert.match(reply.answer, /Eastgardens/);
  assert.match(reply.answer, /Randwick/);
});

test('room-only searches use the room guide and avoid a whole-property lookup', async t => {
  const { reply, queries } = await ask(t, {
    locale: 'zh',
    questions: ['想在 UNSW 附近找个单间，每周预算 500 刀。'],
  });
  assert.equal(queries.length, 0);
  assert.ok(reply.evidence.some((item: { path?: string }) => item.path?.endsWith('#room-search')));
});

test('a mixed question searches the stated weekly budget and retrieves inspection advice', async t => {
  const { reply, queries } = await ask(t, {
    locale: 'zh',
    questions: ['帮我找 Randwick 的两房，预算每周 900 刀。看房时要检查什么？'],
  });
  assert.equal(queries.length, 1);
  assert.equal(queries[0].maxPrice, 900);
  assert.ok(
    reply.evidence.some((item: { path?: string }) => item.path?.endsWith('#room-checklist'))
  );
  assert.match(reply.answer, /A\$900/);
});

test('reviewed NSW payment limits use the actual rent without a model guess', async t => {
  const { reply, queries, modelRequests } = await ask(t, {
    locale: 'zh',
    questions: [
      '我租的是悉尼普通公寓，每周 A$800。中介叫我交 6 周 bond，再预付 4 周租金，说每个留学生都要这样。我该怎么回？',
    ],
  });
  assert.equal(queries.length, 0);
  assert.equal(modelRequests.length, 0);
  assert.match(reply.answer, /A\$3,200/);
  assert.match(reply.answer, /A\$1,600/);
  assert.ok(
    reply.evidence.some((item: { path?: string }) => item.path?.endsWith('#nsw-upfront-payments'))
  );
});

test('a context-only follow-up does not cite NSW lease-ending rules for a condition report', async t => {
  const { reply, modelRequests } = await ask(t, {
    questions: [
      'I just got the keys to a rental in Melbourne. How long do I have to return the condition report?',
      'And if the same lease was in Sydney instead?',
    ],
  });
  assert.equal(modelRequests.length, 0);
  assert.match(reply.answer, /7 days/);
  assert.doesNotMatch(reply.answer, /14 days/);
  assert.ok(reply.evidence[0]?.path.endsWith('#state-report-deadlines'));
});

test('a pet application answered from reviewed NSW rules cannot invert the deadline', async t => {
  const { reply, modelRequests } = await ask(t, {
    locale: 'zh',
    questions: ['在悉尼，租约里写着不能养猫。我已经入住，可以正式申请吗？中介一直不回，怎么算？'],
  });
  assert.equal(modelRequests.length, 0);
  assert.match(reply.answer, /21[^\n]*视为同意/);
  assert.ok(reply.evidence[0]?.path.endsWith('#nsw-pets'));
});

test('a jurisdiction without matching evidence gets a clear coverage answer', async t => {
  const { reply, modelRequests } = await ask(t, {
    locale: 'zh',
    questions: [
      '布里斯班普通住宅租约，中介说允许涨租每隔六个月一次。现在昆州法定涨租频率到底是多少？',
    ],
  });
  assert.equal(modelRequests.length, 0);
  assert.match(reply.answer, /昆州[^\n]*核对/);
  assert.doesNotMatch(reply.answer, /12 个月|60 天/);
});

test('a combined proxy-inspection and no-history question keeps both sources', async t => {
  const { reply, queries } = await ask(t, {
    locale: 'zh',
    questions: [
      '我人在国内，下个月来悉尼读书，第一次在澳洲租房。能让朋友帮我看房吗？没有本地租房记录，我能用什么材料补？',
    ],
  });
  assert.equal(queries.length, 0);
  assert.match(reply.answer, /代看/);
  assert.match(reply.answer, /海外推荐信/);
  assert.ok(
    reply.evidence.some((item: { path?: string }) => item.path?.endsWith('#proxy-deliverables'))
  );
  assert.ok(
    reply.evidence.some((item: { path?: string }) =>
      item.path?.endsWith('#parent-letter-and-history')
    )
  );
});

test('an earliest advertised date does not turn a tenancy question into an inventory search', async t => {
  const { reply, modelRequests, queries } = await ask(t, {
    questions: [
      "A listing says Available Date 1 December, but I won't land until mid-January. Do I have to move in on 1 December?",
    ],
  });
  assert.equal(queries.length, 0);
  assert.equal(modelRequests.length, 0);
  assert.match(reply.answer, /rent is due from that agreed date/);
});

test('an unspoken guide topic survives a second jurisdiction follow-up', async t => {
  const { reply, modelRequests } = await ask(t, {
    questions: [
      'How long do I have to return the condition report in Melbourne?',
      'And if the same lease was in Sydney instead?',
      'What if I were in Melbourne again?',
    ],
  });
  assert.equal(modelRequests.length, 0);
  assert.match(reply.answer, /5 business days/);
});
