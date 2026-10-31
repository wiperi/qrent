export type RentalSearchItem = {
  id: string;
  moduleSlug: string;
  moduleTitle: string;
  title: string;
  excerpt: string;
  searchText: string;
  keywords: string;
  path: string;
};

function normalize(text: string) {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function searchTerms(query: string) {
  const english = query.match(/[a-z0-9]+/g) ?? [];
  const stopwords = new Set([
    'a',
    'the',
    'is',
    'are',
    'for',
    'to',
    'in',
    'of',
    'my',
    'i',
    'how',
    'what',
    'do',
  ]);
  const chinese = query.match(/[\p{Script=Han}]+/gu) ?? [];
  return [
    ...new Set([
      ...english.filter(term => !stopwords.has(term)),
      ...chinese.flatMap(part =>
        part.length === 1
          ? [part]
          : Array.from({ length: part.length - 1 }, (_, i) => part.slice(i, i + 2))
      ),
    ]),
  ];
}

export function searchRentalLibrary(items: RentalSearchItem[], input: string, limit = 8) {
  const query = normalize(input.slice(0, 160));
  const terms = searchTerms(query);
  if (!query || !terms.length) return [];
  return items
    .map((item, index) => {
      const title = normalize(item.title);
      const aliases = normalize(item.keywords);
      const body = normalize(`${item.moduleTitle} ${item.searchText}`);
      const matched = terms.filter(term => `${title} ${aliases} ${body}`.includes(term));
      const score =
        matched.reduce(
          (sum, term) =>
            sum +
            (title.includes(term) ? 5 : 0) +
            (aliases.includes(term) ? 3 : 0) +
            (body.includes(term) ? 1 : 0),
          0
        ) +
        (title.includes(query) ? 15 : 0) +
        (aliases.includes(query) ? 10 : 0);
      return { item, score, matched: matched.length, index };
    })
    .filter(row => row.score > 0 && row.matched >= Math.max(1, Math.ceil(terms.length * 0.35)))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(1, Math.min(20, limit)))
    .map(row => row.item);
}
