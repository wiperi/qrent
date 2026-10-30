import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeBlogCatalog,
  legacyBlogRedirect,
  buildBlogSnapshot,
} from '../../src/lib/blog-catalog';

const zhId = '2d2cf61e-d1da-8109-847d-f19366e320d7';
const oldEnId = '2d2cf61e-d1da-8196-a297-f90d735eb8b7';
const block = (text: string) => [
  {
    id: 'body',
    type: 'paragraph',
    has_children: false,
    paragraph: { rich_text: [{ plain_text: text }] },
  },
];
const post = (id: string, language: string, title: string) => ({
  id,
  language,
  slug: 'before-renting',
  title,
  title_en: 'Copied English title',
  excerpt_zh: '',
  excerpt_en: 'Copied English excerpt',
  published_at: '2025-11-01',
  created_time: '2025-10-01',
});
test('body language corrects a mislabeled Chinese article without changing the current Chinese URL', () => {
  const entries = [
    { post: post(zhId, 'zh', '合租和单租'), blocks: block('中文租房指南。'.repeat(30)) },
    {
      post: post(oldEnId, 'en', '何时开始找房'),
      blocks: block('何时开始找房\n' + '中文租房指南。'.repeat(30)),
    },
  ];
  const rows = normalizeBlogCatalog(entries);
  assert.equal(rows[0].slug, 'before-renting');
  assert.equal(rows[1].language, 'zh');
  assert.notEqual(rows[1].slug, rows[0].slug);
  assert.deepEqual(legacyBlogRedirect('en', 'before-renting', rows), `/zh/blog/${rows[1].slug}`);
  assert.equal(legacyBlogRedirect('zh', 'before-renting', rows), null);
  assert.equal(rows[1].sourceLanguage, 'en');
  assert.equal(rows[1].published_at, '2025-11-01');
});
test('duplicate source IDs and slugs produce stable unique routes independent of source ordering', () => {
  const a = {
    post: post('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'zh', '标题一'),
    blocks: block('中文正文。'.repeat(30)),
  };
  const b = {
    post: post('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'zh', '标题二'),
    blocks: block('另一篇中文。'.repeat(30)),
  };
  const one = normalizeBlogCatalog([a, b, a]);
  const two = normalizeBlogCatalog([b, a]);
  assert.equal(one.length, 2);
  assert.equal(new Set(one.map(row => row.language + ':' + row.slug)).size, 2);
  assert.deepEqual(
    Object.fromEntries(one.map(row => [row.id, row.slug])),
    Object.fromEntries(two.map(row => [row.id, row.slug]))
  );
});
test('a few Chinese addresses in an English guide do not change its language', () => {
  const row = normalizeBlogCatalog([
    {
      post: post('english', 'en', 'Renting'),
      blocks: block(
        'A Sydney rental guide with inspections and applications. '.repeat(20) + '悉尼大学'
      ),
    },
  ])[0];
  assert.equal(row.language, 'en');
});

test('empty and short ambiguous bodies are explicitly unverified, not real English guides', () => {
  for (const blocks of [[], block('这是一段很短的中文正文，还不能确认完整文章。')]) {
    const row = normalizeBlogCatalog([{ post: post(oldEnId, 'en', '短文'), blocks }])[0];
    assert.equal(row.bodyLanguageVerified, false);
    assert.equal(row.id, oldEnId);
  }
});

test('language routes and served blocks are frozen in one catalog snapshot', async () => {
  const chinese = block('中文租房正文。'.repeat(30));
  const english = block('An English rental guide. '.repeat(30));
  let current = chinese;
  let calls = 0;
  const snapshot = await buildBlogSnapshot([post(oldEnId, 'en', '指南')], async () => {
    calls++;
    return current;
  });
  current = english;
  assert.equal(calls, 1);
  assert.equal(snapshot[0].post.language, 'zh');
  assert.deepEqual(snapshot[0].blocks, chinese);
  await assert.rejects(
    () =>
      buildBlogSnapshot([post('one', 'zh', '一'), post('two', 'zh', '二')], async id => {
        if (id === 'two') throw new Error('CMS unavailable');
        return chinese;
      }),
    /CMS unavailable/
  );
});
