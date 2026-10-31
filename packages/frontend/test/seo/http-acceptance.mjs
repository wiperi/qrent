import assert from 'node:assert/strict';
import test from 'node:test';

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
    `${locale}: the library and all eight source-attributed modules render before JavaScript`,
    options,
    async () => {
      const data = await corpus;
      const indexResponse = await fetch(`${base}/${locale}/guides`);
      const indexHtml = await indexResponse.text();
      assert.equal(indexResponse.status, 200);
      assert(indexHtml.includes(`rel="canonical" href="https://www.qrent.rent/${locale}/guides"`));
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
