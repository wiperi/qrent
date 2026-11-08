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
