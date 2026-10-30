import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { CategoryProvider } from '../../src/components/CategoryContext';
import FilteredBlogList from '../../src/components/FilteredBlogList';
import type { NotionBlogPost } from '../../src/types/blog';

test('guide titles and links exist in initial HTML before any browser effect', () => {
  const posts: NotionBlogPost[] = [
    {
      id: 'fixture',
      slug: 'inspection-guide',
      title: '看房指南',
      title_en: 'Rental inspection guide',
      excerpt_zh: '看房前需要核对的事项',
      excerpt_en: 'What to check at an inspection',
      keywords: ['inspection'],
      language: 'en',
      status: 'Published',
      published_at: '2025-11-15T00:00:00.000+11:00',
      created_time: '2026-10-01',
      last_edited_time: '2026-10-01',
      url: 'https://www.notion.so/fixture',
    },
  ];
  const html = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={{}}>
      <CategoryProvider>
        <FilteredBlogList posts={posts} locale="en" />
      </CategoryProvider>
    </NextIntlClientProvider>
  );
  assert.match(html, /href="\/en\/blog\/inspection-guide"/);
  assert.match(html, /Rental inspection guide/);
  assert.ok(!html.includes('No Posts Found'));
  assert.match(html, /15 Nov 2025/);
});
