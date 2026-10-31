import assert from 'node:assert/strict';
import test from 'node:test';
import { getGuideIndexEntries, getGuideIndexTopics } from '../../src/lib/guide-index';
import { filterGuideIndex } from '../../src/lib/guide-index-search';
import { pairedGuides } from '../../src/lib/paired-guides';
import { rentalGuideModules } from '../../src/lib/rental-library';

test('one index includes all 18 real articles in both languages without changing identities', () => {
  const zh = getGuideIndexEntries('zh');
  const en = getGuideIndexEntries('en');
  assert.equal(zh.length, 18);
  assert.deepEqual(
    zh.map(entry => entry.id),
    en.map(entry => entry.id)
  );
  for (const locale of ['zh', 'en'] as const) {
    const entries = getGuideIndexEntries(locale);
    assert.equal(new Set(entries.map(entry => entry.path)).size, 18);
    for (const { post } of pairedGuides.filter(entry => entry.post.language === locale)) {
      const entry = entries.find(item => item.path === `/${locale}/blog/${post.slug}`)!;
      assert(entry);
      assert.equal(entry.publishedAt, post.published_at);
      assert.equal(entry.title, locale === 'zh' ? post.title : post.title_en);
      assert(entry.searchText.length > 100);
    }
    for (const module of rentalGuideModules)
      assert(entries.some(entry => entry.path === `/${locale}/guides/${module.slug}`));
    assert.deepEqual(filterGuideIndex(entries, '  ', []), entries);
  }
});

test('shared topic counts and search intersections include both article sources', () => {
  for (const locale of ['zh', 'en'] as const) {
    const entries = getGuideIndexEntries(locale);
    const topics = getGuideIndexTopics(entries, locale);
    assert.equal(topics.length, 8);
    for (const topic of topics) {
      const results = filterGuideIndex(entries, '', [topic.name]);
      assert.equal(results.length, topic.count);
      assert(results.every(entry => entry.topics.includes(topic.name)));
      assert(results.some(entry => entry.id.startsWith('source:')));
      const searched = filterGuideIndex(entries, locale === 'zh' ? '租房' : 'rental', [topic.name]);
      assert(searched.every(entry => entry.topics.includes(topic.name)));
    }
    assert.deepEqual(filterGuideIndex(entries, '', ['not-a-topic']), []);
    assert.deepEqual(filterGuideIndex(entries, 'qzxv987654321', []), []);
  }
});

test('unified full-content search finds source details and preserves natural question matching', () => {
  for (const [locale, queries] of [
    [
      'zh',
      [
        ['烟雾报警器', 'contracts-and-bond'],
        ['洗衣机', 'inspection-checklist'],
        ['申请要准备什么材料', 'application-documents'],
      ],
    ],
    [
      'en',
      [
        ['smoke alarms', 'contracts-and-bond'],
        ['washing machine', 'inspection-checklist'],
        ['parent support letter', 'application-documents'],
      ],
    ],
  ] as const) {
    const entries = getGuideIndexEntries(locale);
    for (const [query, slug] of queries)
      assert(
        filterGuideIndex(entries, query, []).some(
          entry => entry.path === `/${locale}/guides/${slug}`
        ),
        query
      );
    const budget = getGuideIndexTopics(entries, locale)[0].name;
    assert(
      !filterGuideIndex(entries, 'smoke alarms', [budget]).some(
        entry => entry.id === 'source:contracts-and-bond'
      )
    );
    assert(filterGuideIndex(entries, 'ＵＮＳＷ', []).length);
  }
});

test('visible excerpts remain searchable for both experience and source-based articles', () => {
  const entries = getGuideIndexEntries('en');
  for (const [query, id] of [
    ['semester', 'experience:when-to-start-rental-search'],
    ['defects', 'source:moving-in'],
  ]) {
    assert(
      entries
        .find(entry => entry.id === id)
        ?.excerpt.toLowerCase()
        .includes(query)
    );
    assert(
      filterGuideIndex(entries, query, []).some(entry => entry.id === id),
      query
    );
  }
});
