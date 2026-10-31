import assert from 'node:assert/strict';
import test from 'node:test';
import { filterBlogPosts } from '../../src/lib/blog-search';
import { pairedGuides } from '../../src/lib/paired-guides';

const posts = [
  {
    title: '租房申请材料',
    title_en: 'Rental application documents',
    excerpt_zh: '准备收入证明',
    excerpt_en: 'Prepare proof of income for UNSW students',
    keywords: ['Application documents'],
  },
  {
    title: '看房指南',
    title_en: 'Rental inspection guide',
    excerpt_zh: '核对家具和采光',
    excerpt_en: 'Check the furniture and natural light',
    keywords: ['Inspections and applications'],
  },
];

test('guide search matches bilingual titles, summaries and topics with normalized input', () => {
  for (const query of ['  APPLICATION   documents ', '收入证明', 'ＵＮＳＷ', 'PROOF income']) {
    assert.deepEqual(filterBlogPosts(posts, query, []), [posts[0]], query);
  }
  assert.deepEqual(filterBlogPosts(posts, 'natural light', []), [posts[1]]);
  assert.deepEqual(filterBlogPosts(posts, '   ', []), posts);
  assert.deepEqual(filterBlogPosts(posts, 'nonexistent-987', []), []);
});

test('text and topic filters intersect instead of leaking results from other topics', () => {
  assert.deepEqual(filterBlogPosts(posts, 'rental', [' APPLICATION documents ']), [posts[0]]);
  assert.deepEqual(filterBlogPosts(posts, 'income', ['Inspections and applications']), []);
  assert.deepEqual(filterBlogPosts(posts, '', []), posts);
  for (const locale of ['zh', 'en']) {
    const published = pairedGuides
      .filter(entry => entry.post.language === locale)
      .map(entry => entry.post);
    assert.equal(filterBlogPosts(published, '', []).length, 10);
    for (const topic of new Set(published.flatMap(post => post.keywords))) {
      assert.deepEqual(
        filterBlogPosts(published, '', [topic]),
        published.filter(post => post.keywords.includes(topic))
      );
    }
  }
});
