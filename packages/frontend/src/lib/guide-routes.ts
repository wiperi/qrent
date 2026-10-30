import manifest from '../content/guides/manifest.json';

// Preserve the article actually served by each ambiguous historical URL.
const legacySlugs: Record<string, Record<string, string>> = {
  zh: { 'before-renting': 'shared-vs-private-renting' },
  en: { 'before-renting': 'when-to-start-rental-search' },
};

export function canonicalGuideSlug(locale: string, slug: string): string | null {
  if (locale !== 'zh' && locale !== 'en') return null;
  const canonical = legacySlugs[locale]?.[slug] ?? slug;
  return manifest.some(entry => entry.slug === canonical) ? canonical : null;
}

export function translatedGuidePath(currentLocale: string, targetLocale: string, slug: string) {
  const canonical = canonicalGuideSlug(currentLocale, slug);
  return canonical ? `/${targetLocale}/blog/${canonical}` : `/${targetLocale}/blog`;
}
