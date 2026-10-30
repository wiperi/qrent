import assert from 'node:assert/strict';
import test from 'node:test';
import { pageMetadata, sitemapEntries, jsonLd } from '../../src/lib/seo';

test('each translated page has its own canonical and matching language destinations', () => {
  const meta = pageMetadata('zh', '/about', '关于 QRent', '悉尼留学生租房与通勤信息。');
  assert.equal(meta.alternates?.canonical, 'https://www.qrent.rent/zh/about');
  assert.deepEqual(meta.alternates?.languages, {
    en: 'https://www.qrent.rent/en/about',
    zh: 'https://www.qrent.rent/zh/about',
    'x-default': 'https://www.qrent.rent/en/about',
  });
  assert.equal(meta.openGraph?.url, 'https://www.qrent.rent/zh/about');
  assert.ok(meta.openGraph?.images);
});

test('a Chinese-only article never advertises an absent English translation', () => {
  const meta = pageMetadata('zh', '/blog/sydney-renting', '租房指南', '租房说明', {
    languages: ['zh'],
  });
  assert.deepEqual(meta.alternates?.languages, {
    zh: 'https://www.qrent.rent/zh/blog/sydney-renting',
  });
});

test('sitemap excludes filter pages, deduplicates and keeps only actual article languages and dates', () => {
  const posts = [
    { slug: 'only-zh', language: 'zh', last_edited_time: '2026-10-01T00:00:00Z' },
    { slug: 'only-zh', language: 'zh', last_edited_time: '2026-10-01T00:00:00Z' },
    { slug: 'only-en', language: 'en', last_edited_time: '2026-10-02T00:00:00Z' },
    { slug: '../draft', language: 'zh', last_edited_time: 'invalid' },
  ];
  const entries = sitemapEntries(posts);
  const urls = entries.map(entry => entry.url);
  assert.equal(urls.length, new Set(urls).size);
  assert.ok(urls.includes('https://www.qrent.rent/zh/blog/only-zh'));
  assert.ok(!urls.includes('https://www.qrent.rent/en/blog/only-zh'));
  assert.ok(!urls.some(url => /search|favorite|\.\.|\?/.test(url)));
  const post = entries.find(entry => entry.url.endsWith('/en/blog/only-en'))!;
  assert.equal(post.lastModified, '2026-10-02T00:00:00Z');
  assert.ok(
    entries.filter(entry => !entry.url.includes('/blog/')).every(entry => !entry.lastModified)
  );
});

test('search can be followed without indexing arbitrary filter combinations', () => {
  const meta = pageMetadata('en', '/search', 'Rental search', 'Compare rental homes.', {
    index: false,
  });
  assert.deepEqual(meta.robots, { index: false, follow: true });
  assert.equal(meta.alternates?.languages, undefined);
});

test('JSON-LD data cannot terminate its script element', () => {
  const text = jsonLd({ headline: '</script><script>alert(1)</script>', value: '&\u2028' });
  assert.ok(!text.includes('<'));
  assert.deepEqual(JSON.parse(text), {
    headline: '</script><script>alert(1)</script>',
    value: '&\u2028',
  });
});
