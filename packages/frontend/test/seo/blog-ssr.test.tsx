import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { CategoryProvider } from '../../src/components/CategoryContext';
import FilteredBlogList from '../../src/components/FilteredBlogList';
import { getGuideIndexEntries } from '../../src/lib/guide-index';

test('guide titles and links exist in initial HTML before any browser effect', () => {
  const entries = getGuideIndexEntries('en');
  const html = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={{}}>
      <CategoryProvider>
        <FilteredBlogList entries={entries} locale="en" />
      </CategoryProvider>
    </NextIntlClientProvider>
  );
  for (const entry of entries) assert(html.includes(`href="${entry.path}"`), entry.path);
  assert.equal((html.match(/<article>/g) ?? []).length, 18);
  assert.match(html, /18 guides found/);
  assert.ok(!html.includes('No Posts Found'));
  assert.match(html, /15 Nov 2025/);
});
