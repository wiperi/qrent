import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const key = process.env.QRENT_CLOUD_REPLAY_KEY;
if (!key) throw new Error('The existing production DeepSeek credential is unavailable.');
const site = 'https://www.qrent.rent';
const scenarios = [
  {
    id: 'cover',
    turns: [
      '帮我用英文写一封租房 Cover Letter，申请悉尼一套 2B。我刚收到 UNSW 的 offer，没有澳洲租房史，房租由父母资助。请用占位符留出地址和姓名。',
      '再短一点。补充我在杭州租过房，不要加其他事实。',
    ],
  },
  {
    id: 'parent',
    turns: [
      '帮我写一封英文 Parent Letter。我是申请人的母亲，只资助前 12 周的房租，每周最多 A$450。用占位符留出姓名。',
      '金额改成每周最多 A$420，期限不变。',
    ],
  },
  {
    id: 'transit',
    turns: [
      '帮我查 UNSW 附近 Randwick 的 2B 和 3B，每人每周 A$500，公交 30 分钟内。',
      '只看 3B，公交从 30 分钟改到 25 分钟，其他不变。',
    ],
  },
  {
    id: 'roommates',
    turns: [
      '我在 Flatmates 找到独立卧室，签之前怎么和室友谈水电分摊、访客和清洁？',
      '那访客每天最多能待几小时？平台有统一的规定吗？',
    ],
  },
  {
    id: 'appliance',
    turns: [
      '广告说有洗衣机，但历史照片没拍到，平面图也模糊。现场和签约前要核对什么？',
      '那如果是公用的呢？我应该核对什么？',
    ],
  },
  {
    id: 'status',
    turns: [
      'Domain says deposit taken, but the same address still has an inspection advertised on Realestate.com.au. What should I check before travelling?',
    ],
  },
  {
    id: 'jurisdiction',
    turns: [
      'How long do I have to return a rental condition report in Melbourne?',
      'And if the same lease is in Sydney instead?',
    ],
  },
  {
    id: 'open',
    turns: [
      'I do not have an Australian rental history. How should I prepare a real overseas reference, and whom can I ask?',
    ],
  },
];

function assertTurn(id, index, data) {
  const answer = data.answer;
  assert(answer?.trim(), 'missing answer');
  const listings = data.evidence.filter(source => source.kind === 'listings');
  if (['cover', 'parent'].includes(id)) {
    assert.equal(data.letterType, id);
    assert.equal(listings.length, 0);
    assert.match(data.modelId ?? '', /deepseek/i);
  }
  if (id === 'cover') {
    assert.match(answer, /rental history in Australia/i);
    assert.doesNotMatch(
      answer,
      /never rented|no prior rental history\b(?! in Australia)|non[- ]smok|pet[- ]free|no pets|financially stable|six months in advance/i
    );
    if (index === 1) assert.match(answer, /Hangzhou/i);
  }
  if (id === 'parent') {
    assert.match(answer, /(?:up to|maximum(?: of)?) A\$(?:450|420) per week/i);
    assert.match(answer, /first 12 weeks/i);
    assert.match(answer, index === 0 ? /450/ : /420/);
    if (index === 1) assert.doesNotMatch(answer, /450/);
    assert.doesNotMatch(answer, /guarant(?:ee|or)|all liabilit|indefinit/i);
  }
  if (id === 'transit') {
    assert.deepEqual(
      listings.map(source => [
        source.filters.bedrooms,
        source.filters.maxRent,
        source.filters.maxCommute,
      ]),
      index === 0
        ? [
            [2, 1000, 30],
            [3, 1500, 30],
          ]
        : [[3, 1500, 25]]
    );
    for (const source of listings) {
      assert(
        source.examples.every(
          row => row.commuteMinutes !== null && row.commuteMinutes <= source.filters.maxCommute
        )
      );
    }
    if (index === 1) assert.doesNotMatch(answer, /30\s*分钟/);
  }
  if (id === 'roommates' && index === 1) {
    assert.match(answer, /没能.{0,24}核实/);
    assert.doesNotMatch(answer, /(?:两|二|2)\s*(?:小时|钟头)/);
    assert.match(data.modelId ?? '', /deepseek/i);
  }
  if (id === 'appliance' && index === 0) assert.match(answer, /书面确认.{0,10}随租/);
  if (id === 'status') assert.match(answer, /contact the listing agent/i);
  if (id === 'jurisdiction') assert.match(answer, index === 0 ? /5 business days/ : /7 days/);
}

let failed = 0;
let providerTurns = 0;
let calls = 0;
for (const { id, turns } of scenarios) {
  const sessionId = randomUUID();
  const messages = [];
  let previousSearch;
  for (const [index, question] of turns.entries()) {
    if (++calls > 11) await new Promise(resolve => setTimeout(resolve, 62_000));
    messages.push({ role: 'user', content: question });
    const start = Date.now();
    let result;
    let http;
    try {
      const response = await fetch(site + '/api/rental-assistant/chat', {
        method: 'POST',
        headers: {
          Origin: site,
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + key,
        },
        body: JSON.stringify({
          locale: /[\p{Script=Han}]/u.test(question) ? 'zh' : 'en',
          connection: { type: 'preset', provider: 'deepseek' },
          messages,
          sessionId,
          previousSearch,
        }),
        redirect: 'error',
        signal: AbortSignal.timeout(58_000),
      });
      http = response.status;
      const data = await response.json();
      if (!response.ok) {
        result = { code: data.code };
      } else {
        previousSearch = data.search ?? previousSearch;
        messages.push({ role: 'assistant', content: data.answer });
        if (/deepseek/i.test(data.modelId ?? '')) providerTurns++;
        result = {
          answer: data.answer,
          letterType: data.letterType,
          model: data.modelId,
          reviewId: data.reviewId,
          sources: data.evidence.map(source =>
            source.kind === 'guide'
              ? { id: source.id, path: source.path }
              : {
                  id: source.id,
                  filters: source.filters,
                  matches: source.matches,
                  commuteMinutes: source.examples.map(row => row.commuteMinutes),
                }
          ),
        };
        try {
          assertTurn(id, index, data);
        } catch (error) {
          result.check =
            error.code === 'ERR_ASSERTION'
              ? error.message.slice(0, 350)
              : 'Unexpected check failure';
        }
      }
    } catch {
      result = { code: 'request_failed' };
    }
    if (http !== 200 || result.check) failed++;
    const record = {
      id,
      turn: index + 1,
      question,
      http,
      elapsedMs: Date.now() - start,
      ...result,
    };
    console.log('QRENT_REPLAY ' + JSON.stringify(record).replaceAll(key, '[redacted]'));
  }
}
console.log(JSON.stringify({ total: calls, providerTurns, failed }));
assert(providerTurns >= 5 && failed === 0, 'Cloud replay failed. See the per-turn receipts above.');
