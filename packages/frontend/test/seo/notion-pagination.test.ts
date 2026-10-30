import assert from 'node:assert/strict';
import test from 'node:test';
import { collectNotionPages } from '../../src/lib/notion-pagination';

test('published posts beyond the first combined-language page remain discoverable', async () => {
  const cursors: (string | undefined)[] = [];
  const result = await collectNotionPages(async cursor => {
    cursors.push(cursor);
    return cursor
      ? { results: ['english-post'], has_more: false, next_cursor: null }
      : { results: ['chinese-post'], has_more: true, next_cursor: 'next-page' };
  });
  assert.deepEqual(result, ['chinese-post', 'english-post']);
  assert.deepEqual(cursors, [undefined, 'next-page']);
});
test('broken or repeated cursors fail instead of publishing a truncated catalog', async () => {
  await assert.rejects(
    () => collectNotionPages(async () => ({ results: [], has_more: true, next_cursor: null })),
    /cursor/
  );
  await assert.rejects(
    () =>
      collectNotionPages(async () => ({
        results: ['duplicate'],
        has_more: true,
        next_cursor: 'same',
      })),
    /cursor/
  );
});
