type SearchablePost = {
  title: string;
  title_en: string;
  excerpt_zh?: string;
  excerpt_en?: string;
  keywords: string[];
};

function normalize(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase().trim();
}

/** Local metadata search; article bodies and publication URLs stay unchanged. */
export function filterBlogPosts<T extends SearchablePost>(
  posts: T[],
  query: string,
  categories: string[]
): T[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return posts.filter(post => {
    if (
      !categories.every(category =>
        post.keywords.some(key => normalize(key) === normalize(category))
      )
    ) {
      return false;
    }
    const text = normalize(
      [post.title, post.title_en, post.excerpt_zh, post.excerpt_en, ...post.keywords].join(' ')
    );
    return terms.every(term => text.includes(term));
  });
}
