import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import Renderer from '../../src/components/NotionBlockRenderer';

const rich = (text: string) => [
  {
    type: 'text',
    text: { content: text },
    plain_text: text,
    href: null,
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: 'default',
    },
  },
];
const child = {
  id: 'child',
  type: 'paragraph',
  has_children: false,
  paragraph: { rich_text: rich('Nested guide content') },
};
test('Notion table rows render directly under tbody', () => {
  const html = renderToStaticMarkup(
    <Renderer
      block={{
        id: 'table',
        type: 'table',
        has_children: true,
        children: [
          {
            id: 'row',
            type: 'table_row',
            has_children: false,
            table_row: { cells: [rich('Rent')] },
          },
        ],
      }}
    />
  );
  assert.ok(html.includes('<tbody><tr'));
  assert.ok(!html.includes('<tbody><div'));
  assert.ok(html.includes('Rent'));
});
test('nested guide paragraphs remain visible in paragraphs, quotes and callouts', () => {
  for (const type of ['paragraph', 'quote', 'callout']) {
    const html = renderToStaticMarkup(
      <Renderer
        block={{
          id: 'parent',
          type,
          has_children: true,
          children: [child],
          [type]: { rich_text: rich('Parent content') },
        }}
      />
    );
    assert.ok(html.includes('Nested guide content'), `${type} dropped its nested guide text`);
  }
});
