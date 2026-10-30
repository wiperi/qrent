export async function collectNotionPages<T>(
  load: (cursor?: string) => Promise<{
    results: T[];
    has_more?: boolean;
    next_cursor?: string | null;
  }>
): Promise<T[]> {
  const results: T[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await load(cursor);
    results.push(...page.results);
    if (!page.has_more) return results;
    const next = page.next_cursor;
    if (!next || seen.has(next)) throw new Error('Notion returned an invalid pagination cursor');
    seen.add(next);
    cursor = next;
  } while (cursor);
  return results;
}
