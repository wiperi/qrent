import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const articleManifest = JSON.parse(
  readFileSync(new URL('../../src/content/guides/manifest.json', import.meta.url), 'utf8')
);
const base = process.env.QRENT_SEO_BASE_URL;
const options = { skip: !base };
const corpus = base
  ? fetch(`${base}/knowledge/rental-guides.json`).then(async response => {
      assert.equal(response.status, 200);
      assert.match(response.headers.get('x-robots-tag') ?? '', /noindex/);
      return response.json();
    })
  : null;

test(
  'the static guide corpus has paired citations without a provider request',
  options,
  async () => {
    const data = await corpus;
    assert.equal(data.sourceFiles.length, 2);
    assert.equal(data.experienceSources.length, 20);
    assert.equal(data.chunks.length, 54);
    assert.equal(new Set(data.chunks.map(chunk => chunk.id)).size, data.chunks.length);
    assert(data.retrievalPolicy.preserveJurisdictionAndSourceDates);
  }
);

for (const locale of ['en', 'zh']) {
  test(
    `${locale}: visible topics, search and every article link exist before JavaScript`,
    options,
    async () => {
      const response = await fetch(`${base}/${locale}/blog`);
      const html = await response.text();
      assert.equal(response.status, 200);
      assert(html.includes(`rel="canonical" href="https://www.qrent.rent/${locale}/blog"`));
      assert(!/name="robots" content="[^"]*noindex/.test(html));
      assert.match(html, /type="search"/);
      const topicHtml = html.match(/<fieldset\b[^>]*>([\s\S]*?)<\/fieldset>/)?.[1];
      assert(topicHtml, 'topics must be directly visible before JavaScript');
      const topics =
        locale === 'zh'
          ? [
              '准备与预算',
              '选区与通勤',
              '平台与筛选',
              '材料与申请',
              '看房与防骗',
              '合同与押金',
              '入住与账单',
              '维修与退租',
            ]
          : [
              'Preparation &amp; budget',
              'Areas &amp; commutes',
              'Platforms &amp; search',
              'Documents &amp; applications',
              'Inspections &amp; safety',
              'Leases &amp; bonds',
              'Moving in &amp; bills',
              'Repairs &amp; moving out',
            ];
      assert.equal((topicHtml.match(/<button\b/g) ?? []).length, topics.length + 1);
      for (const topic of topics) assert(topicHtml.includes(topic), topic);
      assert(!topicHtml.includes('<select'));
      assert.match(html, /aria-pressed="true"/);
      assert(html.includes(locale === 'zh' ? '全部主题' : 'All topics'));
      assert(!html.includes('Filter by topic'));
      const data = await corpus;
      const modules = [...new Set(data.chunks.map(chunk => chunk.module))];
      const paths = [
        ...articleManifest.map(source => `/${locale}/blog/${source.slug}`),
        ...modules.map(slug => `/${locale}/guides/${slug}`),
      ];
      assert.equal(paths.length, 18);
      assert.equal((html.match(/<article>/g) ?? []).length, 18);
      assert(!html.includes('Browse the rental handbook'));
      assert(!html.includes('按阶段查全流程攻略'));
      for (const path of paths) assert(html.includes(`href="${path}"`), path);
    }
  );
  test(
    `${locale}: the former directory redirects to the unified index and article URLs stay stable`,
    options,
    async () => {
      const data = await corpus;
      const legacyIndex = await fetch(`${base}/${locale}/guides`, { redirect: 'manual' });
      assert.equal(legacyIndex.status, 308);
      assert.equal(legacyIndex.headers.get('location'), `/${locale}/blog`);
      const indexResponse = await fetch(`${base}/${locale}/blog`);
      const indexHtml = await indexResponse.text();
      assert.equal(indexResponse.status, 200);
      const modules = [
        ...new Set(data.chunks.filter(chunk => chunk.locale === locale).map(chunk => chunk.module)),
      ];
      assert.equal(modules.length, 8);
      for (const slug of modules) {
        const path = `/${locale}/guides/${slug}`;
        assert(indexHtml.includes(`href="${path}"`));
        const response = await fetch(`${base}${path}`);
        const html = await response.text();
        assert.equal(response.status, 200, path);
        assert(html.includes(`rel="canonical" href="https://www.qrent.rent${path}"`), path);
        assert(!/name="robots" content="[^"]*noindex/.test(html), path);
        assert(html.includes('"@type":"Article"'), path);
        assert(html.includes('"@type":"BreadcrumbList"'), path);
        assert(html.includes(`href="/${locale}/blog"`), path);
        assert(!html.includes(`href="/${locale}/guides"`), path);
        for (const chunk of data.chunks.filter(
          chunk => chunk.locale === locale && chunk.module === slug
        )) {
          assert(html.includes(`id="${new URL(chunk.canonicalUrl).hash.slice(1)}"`), chunk.id);
          assert(html.includes(chunk.title), chunk.id);
        }
      }
    }
  );
  for (const missing of ['qrent-seo-missing-page', 'rentals/qrent-seo-missing-school']) {
    test(`${locale}/${missing}: missing route returns a useful no-JS 404`, options, async () => {
      const response = await fetch(`${base}/${locale}/${missing}`, { redirect: 'manual' });
      const html = await response.text();
      assert.equal(response.status, 404);
      assert.ok(/<h1[\s>]/.test(html), '404 must render its heading without JavaScript');
      assert.match(html, new RegExp(`href="/${locale}/rentals"`));
      assert.match(html, /name="robots" content="[^"]*noindex/);
      assert.ok(!html.includes('id="__next_error__"'));
    });
  }
  test(
    `${locale}: initial HTML has a matching locale, canonical and a single update notice`,
    options,
    async () => {
      const response = await fetch(`${base}/${locale}`);
      const html = await response.text();
      assert.equal(response.status, 200);
      assert.match(html, new RegExp(`<html[^>]*lang="${locale === 'zh' ? 'zh-CN' : 'en-AU'}"`));
      assert.ok(html.includes(`rel="canonical" href="https://www.qrent.rent/${locale}"`));
      assert.ok(html.includes(locale === 'zh' ? '房源已恢复更新' : 'Listing updates have resumed'));
      assert.ok(!html.includes('全流程托管'));
      assert.match(html, new RegExp(`href="/${locale}/rentals/unsw"`));
    }
  );
  if (process.env.QRENT_SEO_VERIFY_BLOGS === '1') {
    test(`${locale}: missing article is a real 404 with recovery links`, options, async () => {
      const response = await fetch(`${base}/${locale}/blog/qrent-seo-missing-article`);
      const html = await response.text();
      assert.equal(response.status, 404);
      assert.match(html, /name="robots" content="[^"]*noindex/);
    });
  }
}
