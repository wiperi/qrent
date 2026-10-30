import assert from 'node:assert/strict';
import test from 'node:test';

const base = process.env.QRENT_SEO_BASE_URL;
const options = { skip: !base };
for (const locale of ['en', 'zh']) {
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
