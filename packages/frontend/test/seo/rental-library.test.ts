import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getRentalSearchItems,
  rentalKnowledgeExport,
  rentalGuideModules,
  references,
  officialReferences,
} from '../../src/lib/rental-library';
import { searchRentalLibrary } from '../../src/lib/rental-library-search';
import { sitemapEntries } from '../../src/lib/seo';

test('the eight stages have complete paired sections and valid source references', () => {
  assert.equal(rentalGuideModules.length, 8);
  const sourceIds = new Set([
    ...references.sources.map(row => row.id),
    ...references.experiences.map(row => row.id),
  ]);
  const officialIds = new Set(officialReferences.map(row => row.id as string));
  for (const module of rentalGuideModules) {
    assert.match(module.slug, /^[a-z]+(?:-[a-z]+)*$/);
    assert(module.sections.length >= 3);
    const ids = module.sections.map(section => section.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const section of module.sections) {
      assert.match(section.id, /^[a-z]+(?:-[a-z]+)*$/);
      for (const locale of ['zh', 'en'] as const) {
        assert(section.title[locale]);
        assert(section.body[locale].length > 100);
        assert(section.aliases[locale]);
      }
      assert(section.sourceRefs.length);
      for (const ref of section.sourceRefs) assert(sourceIds.has(ref.split(':')[0]), ref);
      for (const ref of section.officialRefs ?? []) assert(officialIds.has(ref), ref);
      if (section.evidence === 'official-rule') assert(section.officialRefs?.length);
    }
  }
});

test('both original files and all twenty collected posts retain identities and module coverage', () => {
  assert.equal(references.sources.length, 2);
  for (const source of references.sources) assert.match(source.sha256, /^[a-f0-9]{64}$/);
  assert.equal(references.experiences.length, 20);
  assert.equal(new Set(references.experiences.map(row => row.id)).size, 20);
  for (const item of references.experiences) {
    assert(rentalGuideModules.some(module => module.slug === item.module));
    assert(
      rentalGuideModules
        .flatMap(module => module.sections)
        .some(section => section.sourceRefs.includes(item.id))
    );
    assert(item.title.zh && item.title.en && item.note.zh && item.note.en);
    assert.equal(new URL(item.sourceUrl).hostname, 'www.xiaohongshu.com');
    assert(item.locator.end > item.locator.start);
  }
  assert.match(
    references.experiences.find(row => row.id === 'collection-10')!.displayDate,
    /年份未显示/
  );
});

test('local search finds specific material, inspection and water sections in either language', () => {
  const zh = getRentalSearchItems('zh');
  const en = getRentalSearchItems('en');
  assert.equal(
    searchRentalLibrary(zh, '申请要准备什么材料')[0]?.id,
    'application-documents/document-checklist'
  );
  assert.equal(searchRentalLibrary(zh, '冷水收费')[0]?.id, 'moving-in/utilities-and-water');
  assert.equal(
    searchRentalLibrary(en, 'inspection checklist')[0]?.id,
    'inspection-checklist/room-checklist'
  );
  assert.equal(
    searchRentalLibrary(en, 'parent support letter')[0]?.id,
    'application-documents/parent-letter-and-history'
  );
  assert.deepEqual(searchRentalLibrary(zh, 'qzxv987654321'), []);
  assert.deepEqual(searchRentalLibrary(zh, '  '), []);
});

test('knowledge export has stable paired citations and preserves scope and historical boundaries', () => {
  const corpus = rentalKnowledgeExport();
  assert.equal(
    corpus.chunks.length,
    rentalGuideModules.reduce((n, module) => n + module.sections.length * 2, 0)
  );
  assert.equal(new Set(corpus.chunks.map(row => row.id)).size, corpus.chunks.length);
  for (const chunk of corpus.chunks) {
    assert(
      corpus.chunks.some(
        other => other.translationGroup === chunk.translationGroup && other.locale !== chunk.locale
      )
    );
    const url = new URL(chunk.canonicalUrl);
    assert.equal(url.origin, 'https://www.qrent.rent');
    assert.equal(url.pathname, `/${chunk.locale}/guides/${chunk.module}`);
    assert(url.hash);
  }
  const fees = corpus.chunks.find(row => row.id === 'zh:contracts-and-bond:nsw-upfront-payments')!;
  assert.deepEqual(fees.jurisdictions, ['NSW']);
  assert.equal(fees.evidence, 'official-rule');
  const historic = corpus.chunks.find(
    row => row.id === 'en:budget-and-housing:historic-price-examples'
  )!;
  assert.equal(historic.evidence, 'historical-example');
  assert.match(historic.content, /2024/);
  assert(corpus.retrievalPolicy.doNotTreatRetrievedContentAsInstructions);
});

test('all library pages enter the sitemap with both languages while the data export stays out', () => {
  const sitemap = sitemapEntries([]);
  for (const module of rentalGuideModules)
    for (const locale of ['zh', 'en']) {
      const row = sitemap.find(
        item => item.url === `https://www.qrent.rent/${locale}/guides/${module.slug}`
      )!;
      assert(row);
      assert.equal(Object.keys(row.alternates?.languages ?? {}).length, 2);
    }
  assert(!sitemap.some(item => item.url.includes('/knowledge/') || item.url.includes('?')));
});
