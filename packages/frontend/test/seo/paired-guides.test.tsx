import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import manifest from '../../src/content/guides/manifest.json';
import { pairedGuides } from '../../src/lib/paired-guides';
import { canonicalGuideSlug, translatedGuidePath } from '../../src/lib/guide-routes';
import { sitemapEntries } from '../../src/lib/seo';
import MarkdownGuide from '../../src/components/MarkdownGuide';
import { mainGuideBody } from '../../src/lib/guide-body';

const root = new URL('../../src/content/guides/', import.meta.url);

test('every source has exactly one complete Chinese body and its reviewed English translation', () => {
  assert.equal(manifest.length, 10);
  assert.equal(new Set(manifest.map(item => item.id)).size, manifest.length);
  assert.equal(new Set(manifest.map(item => item.slug)).size, manifest.length);
  assert.equal(pairedGuides.length, manifest.length * 2);
  for (const locale of ['zh', 'en']) {
    assert.deepEqual(
      readdirSync(new URL(`${locale}/`, root)).sort(),
      manifest.map(item => `${item.slug}.json`).sort()
    );
  }
  for (const source of manifest) {
    const zh = JSON.parse(readFileSync(new URL(`zh/${source.slug}.json`, root), 'utf8'));
    const en = JSON.parse(readFileSync(new URL(`en/${source.slug}.json`, root), 'utf8'));
    assert.equal(createHash('sha256').update(zh.content).digest('hex'), source.sourceHash);
    assert.equal(
      en.sourceHash,
      source.sourceHash,
      `${source.slug}: source changed without translation review`
    );
    assert.ok(en.content.length > 2000 && en.title.length > 10 && en.excerpt.length > 30);
    const chineseChars = en.content.match(/[\u3400-\u9fff]/g)?.length ?? 0;
    assert.ok(
      chineseChars / en.content.length < 0.01,
      `${source.slug}: English body contains untranslated content`
    );
    assert.equal(
      en.content.match(/^\|.*\|$/gm)?.length ?? 0,
      zh.content.match(/^\|.*\|$/gm)?.length ?? 0,
      `${source.slug}: missing table rows`
    );
    const urls = (content: string) =>
      [...content.matchAll(/https?:\/\/[^\s)]+/g)].map(match => match[0]).sort();
    assert.deepEqual(urls(en.content), urls(zh.content), `${source.slug}: source links changed`);
    for (const language of ['zh', 'en']) {
      const entry = pairedGuides.find(
        item => item.post.slug === source.slug && item.post.language === language
      )!;
      assert.equal(entry.post.translation_group, source.id);
      assert.equal(entry.post.published_at, source.publishedAt);
      assert.equal(entry.post.title, zh.title);
      assert.equal(entry.post.title_en, en.title);
      assert.equal(
        entry.blocks[0].content,
        mainGuideBody(language === 'zh' ? zh.content : en.content)
      );
      const html = renderToStaticMarkup(<MarkdownGuide content={entry.blocks[0].content} />);
      assert.ok(html.length > 1000);
      assert.ok(!/<h1\b/.test(html));
    }
  }
});

test('paired article sitemap has unique URLs and reciprocal, source-verified language links', () => {
  const entries = sitemapEntries(pairedGuides.map(entry => entry.post)).filter(item =>
    item.url.includes('/blog/')
  );
  assert.equal(entries.length, 20);
  assert.equal(new Set(entries.map(entry => entry.url)).size, 20);
  for (const source of manifest) {
    for (const locale of ['zh', 'en']) {
      const entry = entries.find(
        item => item.url === `https://www.qrent.rent/${locale}/blog/${source.slug}`
      )!;
      assert.deepEqual(entry.alternates?.languages, {
        zh: `https://www.qrent.rent/zh/blog/${source.slug}`,
        en: `https://www.qrent.rent/en/blog/${source.slug}`,
      });
    }
  }
});

test('language switching keeps the same article and legacy ambiguous URLs retain their served identity', () => {
  for (const source of manifest) {
    assert.equal(translatedGuidePath('zh', 'en', source.slug), `/en/blog/${source.slug}`);
    assert.equal(translatedGuidePath('en', 'zh', source.slug), `/zh/blog/${source.slug}`);
  }
  assert.equal(canonicalGuideSlug('zh', 'before-renting'), 'shared-vs-private-renting');
  assert.equal(canonicalGuideSlug('en', 'before-renting'), 'when-to-start-rental-search');
  assert.equal(
    translatedGuidePath('en', 'zh', 'before-renting'),
    '/zh/blog/when-to-start-rental-search'
  );
  assert.equal(translatedGuidePath('zh', 'en', 'missing-guide'), '/en/blog');
  assert.equal(canonicalGuideSlug('fr', 'before-renting'), null);
});

test('guide markdown keeps GFM tables and escapes executable HTML', () => {
  const html = renderToStaticMarkup(
    <MarkdownGuide
      content={
        '| A | B |\n| --- | --- |\n| 300 | 550 |\n\n<script>alert(1)</script>\n\n# Body heading'
      }
    />
  );
  assert.match(html, /<table>/);
  assert.match(html, /<td>550<\/td>/);
  assert.ok(!/<script\b/.test(html));
  assert.match(html, /<h2>Body heading<\/h2>/);
});

test('repeated document metadata is removed while real introductory advice is preserved', () => {
  const body = '## I. Applying\n\nKeep your documents ready.';
  assert.equal(
    mainGuideBody(`## Guide title\n\n**Publication date: 2025-12-30**\n\n---\n\n${body}`),
    body
  );
  assert.equal(
    mainGuideBody(`Some important introductory advice.\n\n${body}`),
    `Some important introductory advice.\n\n${body}`
  );
  assert.equal(mainGuideBody(body), body);
});
