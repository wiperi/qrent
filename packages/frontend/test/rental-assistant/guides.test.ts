import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blogPassages, retrieveGuides } from '../../src/lib/rental-assistant/guides';
import { pairedGuides } from '../../src/lib/paired-guides';
import { rentalGuideModules } from '../../src/lib/rental-library';

test('the assistant retrieves full blog and handbook bodies in both languages', () => {
  for (const locale of ['zh', 'en'] as const) {
    const expected = [
      ...pairedGuides
        .filter(({ post }) => post.language === locale)
        .map(({ post }) => '/' + locale + '/blog/' + post.slug),
      ...rentalGuideModules.map(module => '/' + locale + '/guides/' + module.slug),
    ];
    const passages = blogPassages(locale);
    assert.deepEqual(new Set(passages.map(item => item.path.split('#')[0])), new Set(expected));
    assert.ok(passages.every(passage => passage.text.length > 0));
  }
});

test('colloquial repair and inspection questions surface the relevant passage first', () => {
  const repairs = retrieveGuides('浴室漏水房东不管怎么办？', 'zh').passages;
  const inspections = retrieveGuides('What do I check at an inspection?', 'en').passages;
  assert.equal(repairs[0].heading, '维修先建立清楚的记录');
  assert.equal(inspections[0].heading, 'Inspect the rooms and facilities');
});

test('legacy FAQ wording reaches relevant reviewed sections in both languages', () => {
  const questions = [
    ['zh', 'condition report 在退押金时怎么用？', '#exit-and-bond'],
    ['zh', '在国内能提前租好房吗？', '#listing-history-and-booking'],
    ['zh', 'open inspection 是什么意思？怎么预约？', '#before-inspection'],
    ['zh', '没有澳洲信用记录租房难吗？', '#parent-letter-and-history'],
    ['zh', '房东多久会来检查一次？', '#nsw-access'],
    ['zh', '房东可以随便涨租吗？', '#nsw-lease-type-and-increases'],
    ['zh', '可以在房间里养宠物吗？', '#nsw-pets'],
    ['zh', '假期回国，能短租出去吗？合法吗？', '#nsw-shared-tenancy'],
    ['zh', '要提前多久通知房东我要搬？', '#nsw-ending-notice'],
    ['zh', '有什么官方渠道可以查房东或中介资质？', '#verify-agent-and-listing'],
    [
      'en',
      'Do I have to attend an open inspection myself? Can a friend go for me?',
      '#listing-history-and-booking',
    ],
    ['en', 'Can I apply without an Australian credit history?', '#parent-letter-and-history'],
    ['en', 'Can I withhold rent when repairs are ignored?', '#repair-records'],
    ['en', 'Does the condition report help me get my bond back?', '#exit-and-bond'],
  ] as const;
  for (const [locale, question, anchor] of questions) {
    assert.ok(retrieveGuides(question, locale).passages[0]?.path.endsWith(anchor), question);
  }
});

test('a state-specific question excludes handbook passages limited to other states', () => {
  const { passages } = retrieveGuides('What is the maximum bond in Victoria?', 'en');
  assert.ok(passages.length);
  assert.ok(
    passages.every(
      item =>
        !item.jurisdictions ||
        item.jurisdictions.some(state => state === 'VIC' || state === 'Australia')
    )
  );
});

test('realistic wording retrieves the reviewed rule or practical checklist first', () => {
  const cases = [
    [
      'zh',
      '我租的是悉尼普通公寓，每周 A$800。中介叫我交 6 周 bond，再预付 4 周租金。',
      '#nsw-upfront-payments',
    ],
    ['zh', '房东把整栋楼的冷水账单发给我，叫我分摊。', '#utilities-and-water'],
    ['zh', '悉尼签了一年，刚住三个月。给 14 天通知就能走吗？', '#nsw-ending-notice'],
    [
      'en',
      "They won't let me inspect and want me to bank-transfer a bond tonight.",
      '#verify-agent-and-listing',
    ],
    [
      'en',
      'How long do I have to return the condition report in Melbourne?',
      '#state-report-deadlines',
    ],
    ['zh', '老攻略里说 Scape 的 twin，我想一个人睡一间。', '#housing-options'],
  ] as const;
  for (const [locale, question, anchor] of cases)
    assert.ok(retrieveGuides(question, locale).passages[0]?.path.endsWith(anchor), question);
});

test('a changed city reuses the previous topic and refreshes the jurisdiction', () => {
  const { passages } = retrieveGuides('And if the same lease was in Sydney instead?', 'en', {
    previousUserQuestion:
      'I just got the keys in Melbourne. How long do I have to return the condition report?',
  });
  assert.ok(passages[0]?.path.endsWith('#state-report-deadlines'));
});
