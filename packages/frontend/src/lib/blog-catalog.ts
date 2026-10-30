type SourcePost = {
  id: string;
  slug: string;
  language: string;
  title: string;
  title_en: string;
  created_time?: string;
  published_at?: string;
  excerpt_zh?: string;
  excerpt_en?: string;
};
type ContentBlock = { type: string; children?: ContentBlock[]; [key: string]: unknown };
export type RoutedPost<T> = Omit<T, 'language' | 'slug'> & {
  language: 'en' | 'zh';
  slug: string;
  sourceLanguage: string;
  sourceSlug: string;
  bodyLanguageVerified: boolean;
};

// Identities actually served at these legacy URLs before this repair. A newly
// published duplicate must not silently take over an existing article URL.
const LEGACY_PRIMARY: Record<string, string> = {
  'zh:before-renting': '2d2cf61e-d1da-8109-847d-f19366e320d7',
  'en:before-renting': '2d2cf61e-d1da-8196-a297-f90d735eb8b7',
};

function contentText(blocks: ContentBlock[]): string {
  return blocks
    .flatMap(block => {
      if (block.type === 'code') return [];
      const value = block[block.type] as
        | { rich_text?: { plain_text?: string }[]; cells?: { plain_text?: string }[][] }
        | undefined;
      return [
        (value?.rich_text ?? []).map(text => text.plain_text ?? '').join(''),
        ...(value?.cells ?? []).map(cell => cell.map(text => text.plain_text ?? '').join('')),
        contentText(block.children ?? []),
      ];
    })
    .filter(Boolean)
    .join('\n');
}

export function normalizeBlogCatalog<T extends SourcePost>(
  entries: { post: T; blocks: ContentBlock[] }[]
): RoutedPost<T>[] {
  const unique = [...new Map(entries.map(entry => [entry.post.id, entry])).values()];
  const rows = unique.map(({ post, blocks }) => {
    const text = contentText(blocks);
    const chinese = (text.match(/[\u3400-\u9fff]/g) ?? []).length;
    const latin = (text.match(/[a-z]/gi) ?? []).length;
    const ratio = chinese / Math.max(1, chinese + latin);
    const language: 'en' | 'zh' =
      chinese >= 80 && ratio >= 0.6
        ? 'zh'
        : latin >= 300 && ratio <= 0.02
          ? 'en'
          : post.language === 'zh'
            ? 'zh'
            : 'en';
    const bodyLanguageVerified =
      ((chinese >= 80 && ratio >= 0.6) || (latin >= 300 && ratio <= 0.02)) &&
      (language === 'zh' ? post.title : post.title_en).trim().length > 0;
    return {
      ...post,
      language,
      sourceLanguage: post.language,
      sourceSlug: post.slug,
      bodyLanguageVerified,
    } as RoutedPost<T>;
  });
  const groups = new Map<string, RoutedPost<T>[]>();
  for (const row of rows) {
    const key = `${row.language}:${row.sourceSlug}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  for (const [key, group] of groups) {
    const ordered = [...group].sort(
      (a, b) =>
        (a.created_time ?? '').localeCompare(b.created_time ?? '') ||
        (a.published_at ?? '').localeCompare(b.published_at ?? '') ||
        a.id.localeCompare(b.id)
    );
    const primary = LEGACY_PRIMARY[key]
      ? group.find(row => row.id === LEGACY_PRIMARY[key])
      : ordered[0];
    for (const row of group) {
      if (row !== primary)
        row.slug = `${row.sourceSlug}-${row.id.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;
    }
  }
  const used = new Set<string>();
  for (const row of rows) {
    const key = `${row.language}:${row.slug}`;
    if (used.has(key)) throw new Error('Published articles have an ambiguous canonical route');
    used.add(key);
  }
  return rows;
}

export async function buildBlogSnapshot<T extends SourcePost, B extends ContentBlock>(
  posts: T[],
  readBlocks: (id: string) => Promise<B[]>
): Promise<{ post: RoutedPost<T>; blocks: B[] }[]> {
  const entries = [];
  for (const post of [...new Map(posts.map(post => [post.id, post])).values()]) {
    entries.push({ post, blocks: await readBlocks(post.id) });
  }
  const normalized = normalizeBlogCatalog(entries);
  const bodies = new Map(entries.map(entry => [entry.post.id, entry.blocks]));
  return normalized.map(post => ({ post, blocks: bodies.get(post.id)! }));
}

export function legacyBlogRedirect(
  locale: string,
  slug: string,
  posts: { id: string; slug: string; language: string; bodyLanguageVerified: boolean }[]
): string | null {
  const id = LEGACY_PRIMARY[`${locale}:${slug}`];
  const target = id ? posts.find(post => post.id === id) : undefined;
  if (target?.bodyLanguageVerified && (target.language !== locale || target.slug !== slug))
    return `/${target.language}/blog/${encodeURIComponent(target.slug)}`;
  return null;
}
