import assert from 'node:assert/strict';
import test from 'node:test';
import { TypeSafeNotionClient } from '../../src/lib/notion';

test('one invalid published row fails the catalog rather than returning surviving rows', async () => {
  const oldToken = process.env.NOTION_TOKEN;
  const oldDatabase = process.env.NOTION_DATABASE_ID;
  process.env.NOTION_TOKEN = 'offline-test-only';
  process.env.NOTION_DATABASE_ID = 'offline-test-database';
  const rich = (value: string, type = 'rich_text') => ({ type, [type]: [{ plain_text: value }] });
  const valid = {
    id: 'valid-published',
    url: 'https://www.notion.so/valid',
    cover: null,
    created_time: '2025-10-01',
    last_edited_time: '2025-10-01',
    properties: {
      Title: rich('中文指南', 'title'),
      Title_en: rich('Rental guide'),
      slug: rich('rental-guide'),
      status: { type: 'select', select: { name: 'Published' } },
      language: { type: 'select', select: { name: 'zh' } },
      Published_at: { type: 'date', date: { start: '2025-10-01' } },
    },
  };
  try {
    const client = new TypeSafeNotionClient();
    Object.defineProperty(client, 'queryDatabase', {
      configurable: true,
      value: async () => ({
        results: [
          valid,
          {
            ...valid,
            id: 'invalid-published',
            properties: { ...valid.properties, slug: rich('') },
          },
        ],
      }),
    });
    await assert.rejects(() => client.getPublishedBlogPosts(), /incomplete/i);
    Object.defineProperty(client, 'queryDatabase', {
      configurable: true,
      value: async () => ({
        results: [{ ...valid, properties: { ...valid.properties, Title_en: rich('') } }],
      }),
    });
    const untranslated = await client.getPublishedBlogPosts();
    assert.equal(untranslated.length, 1);
    assert.equal(untranslated[0].title_en, '');
  } finally {
    if (oldToken === undefined) delete process.env.NOTION_TOKEN;
    else process.env.NOTION_TOKEN = oldToken;
    if (oldDatabase === undefined) delete process.env.NOTION_DATABASE_ID;
    else process.env.NOTION_DATABASE_ID = oldDatabase;
  }
});

test('published article recursion does not publish child pages or child databases', async () => {
  const oldToken = process.env.NOTION_TOKEN;
  const oldDatabase = process.env.NOTION_DATABASE_ID;
  process.env.NOTION_TOKEN = 'offline-test-only';
  process.env.NOTION_DATABASE_ID = 'offline-test-database';
  try {
    const calls: string[] = [];
    const client = new TypeSafeNotionClient();
    Object.defineProperty(client, 'client', {
      value: {
        blocks: {
          children: {
            list: async ({ block_id }: { block_id: string }) => {
              calls.push(block_id);
              if (block_id !== 'published-root')
                throw new Error('Unpublished child must not be fetched');
              return {
                results: [
                  { id: 'private-page', type: 'child_page', has_children: true },
                  { id: 'private-database', type: 'child_database', has_children: true },
                ],
                has_more: false,
              };
            },
          },
        },
      },
    });
    const rows = await client.getBlogPostContent('published-root');
    assert.equal(rows.length, 2);
    assert.deepEqual(calls, ['published-root']);
    assert.ok(rows.every(row => !row.children));
  } finally {
    if (oldToken === undefined) delete process.env.NOTION_TOKEN;
    else process.env.NOTION_TOKEN = oldToken;
    if (oldDatabase === undefined) delete process.env.NOTION_DATABASE_ID;
    else process.env.NOTION_DATABASE_ID = oldDatabase;
  }
});
