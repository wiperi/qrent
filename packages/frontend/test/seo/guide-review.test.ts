import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import editorial from '../../src/content/guides/editorial-review-20261031.json';
import manifest from '../../src/content/guides/manifest.json';
import { pairedGuides } from '../../src/lib/paired-guides';
import { guideReviewedAt, reviewedGuideBody } from '../../src/lib/guide-review';

test('reviewed publications preserve all source identities and original dates in both languages', () => {
  assert.equal(Object.keys(editorial.reviews).length, 10);
  for (const source of manifest) {
    const review = editorial.reviews[source.slug as keyof typeof editorial.reviews];
    assert.equal(review.sourceHash, source.sourceHash);
    assert.equal(review.zh.length, review.en.length);
    for (const locale of ['zh', 'en'] as const) {
      const sourceDoc = JSON.parse(
        readFileSync(
          new URL(`../../src/content/guides/${locale}/${source.slug}.json`, import.meta.url),
          'utf8'
        )
      );
      const body = reviewedGuideBody(source.slug, locale, source.sourceHash, sourceDoc.content);
      assert.notEqual(body, sourceDoc.content);
      const entry = pairedGuides.find(
        item => item.post.slug === source.slug && item.post.language === locale
      )!;
      assert.equal(entry.post.translation_group, source.id);
      assert.equal(entry.post.published_at, source.publishedAt);
      assert.equal(entry.post.last_edited_time, guideReviewedAt(source.slug));
      assert(Date.parse(entry.post.last_edited_time) > Date.parse(source.publishedAt));
    }
  }
});

test('source drift and repeated or missing review fragments block publication', () => {
  const source = manifest.find(item => item.slug === 'rental-inspection')!;
  assert.throws(() => reviewedGuideBody(source.slug, 'zh', 'changed-source', 'body'), /Stale/);
  assert.throws(() => reviewedGuideBody(source.slug, 'zh', source.sourceHash, 'body'), /Ambiguous/);
  const original = JSON.parse(
    readFileSync(
      new URL('../../src/content/guides/zh/rental-inspection.json', import.meta.url),
      'utf8'
    )
  ).content;
  assert.throws(
    () => reviewedGuideBody(source.slug, 'zh', source.sourceHash, original + original),
    /Ambiguous/
  );
  assert.equal(reviewedGuideBody('unreviewed', 'en', 'hash', 'body'), 'body');
});

test('published advice corrects payment timing, referee integrity and unavailable features', () => {
  const body = (slug: string, locale: string) =>
    pairedGuides.find(item => item.post.slug === slug && item.post.language === locale)!.blocks[0]
      .content;
  assert(
    !body('rental-inspection', 'zh').includes(
      '所有费用（包括押金、定金）应在签署正式租赁合同后再支付'
    )
  );
  assert.match(body('rental-inspection', 'en'), /before signing, capped at one week/);
  assert(
    !body('available-date-rental-cover-letter', 'en').includes(
      'complete the questionnaire yourself'
    )
  );
  assert.match(body('available-date-rental-cover-letter', 'zh'), /不冒充房东/);
  assert.match(body('rental-platforms-from-overseas', 'en'), /existing Sydney school-area scope/);
  assert.match(body('rental-application-results', 'en'), /does not automatically track/);
  assert(!body('rental-application-results', 'en').includes('Australia does not have a'));
  assert.match(body('rental-application-results', 'zh'), /租赁数据库说明/);
  assert.match(body('shared-vs-private-renting', 'zh'), /历史预算示例/);
  assert(!body('rental-history-guarantor', 'en').includes('paying 6 months'));
  assert(!body('when-to-start-rental-search', 'zh').includes('领先一半人'));
  assert(!body('types-of-apartments', 'en').includes('★★★★★'));
  assert(!body('types-of-apartments', 'en').includes('Some landlords do not have'));
  assert(!body('when-to-start-rental-search', 'en').includes('Set up water, electricity'));
  assert(!body('rental-application-australia', 'en').includes('over a hundred applications'));
  assert(
    !body('rental-application-australia', 'en').includes(
      'chances of approval for popular listings are highest'
    )
  );
  assert.match(body('rental-inspection', 'zh'), /^## \*\*一/);
});
