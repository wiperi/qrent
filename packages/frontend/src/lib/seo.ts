import type { Metadata, MetadataRoute } from 'next';
import { RENTAL_SCHOOLS } from './rental-schools';

export const SITE_URL = 'https://www.qrent.rent';
export const SITE_IMAGE = `${SITE_URL}/qrent.jpg`;
export const LANGUAGES = ['en', 'zh'] as const;

export function pageMetadata(
  locale: string,
  path: string,
  title: string,
  description: string,
  options: { index?: boolean; languages?: readonly string[] } = {}
): Metadata {
  const url = `${SITE_URL}/${locale}${path}`;
  const available = options.languages ?? LANGUAGES;
  const languages: Record<string, string> = {};
  for (const language of available) languages[language] = `${SITE_URL}/${language}${path}`;
  if (available.includes('en')) languages['x-default'] = `${SITE_URL}/en${path}`;
  return {
    title,
    description,
    alternates: { canonical: url, ...(options.index === false ? {} : { languages }) },
    ...(options.index === false ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title,
      description,
      url,
      siteName: 'QRent',
      type: 'website',
      locale: locale === 'zh' ? 'zh_CN' : 'en_AU',
      images: [
        { url: SITE_IMAGE, width: 3508, height: 2480, alt: 'QRent — Sydney student rentals' },
      ],
    },
    twitter: { card: 'summary_large_image', title, description, images: [SITE_IMAGE] },
  };
}

export function jsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function breadcrumbs(locale: string, items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}/${locale}${item.path}`,
    })),
  };
}

export type SitemapPost = { slug: string; language: string; last_edited_time?: string };
export function sitemapEntries(posts: SitemapPost[]): MetadataRoute.Sitemap {
  const paths = [
    '',
    '/about',
    '/team',
    '/contact',
    '/blog',
    '/rentals',
    ...RENTAL_SCHOOLS.map(school => `/rentals/${school.slug}`),
  ];
  const result: MetadataRoute.Sitemap = LANGUAGES.flatMap(locale =>
    paths.map(path => ({
      url: `${SITE_URL}/${locale}${path}`,
      alternates: {
        languages: Object.fromEntries(LANGUAGES.map(lang => [lang, `${SITE_URL}/${lang}${path}`])),
      },
    }))
  );
  const seen = new Set(result.map(item => item.url));
  for (const post of posts) {
    if (
      !LANGUAGES.some(lang => lang === post.language) ||
      !post.slug ||
      /[/\\?#]|^\./.test(post.slug)
    )
      continue;
    const path = `/blog/${encodeURIComponent(post.slug)}`;
    const url = `${SITE_URL}/${post.language}${path}`;
    if (seen.has(url)) continue;
    seen.add(url);
    const translations = posts.filter(
      other => other.slug === post.slug && LANGUAGES.some(lang => lang === other.language)
    );
    result.push({
      url,
      ...(post.last_edited_time && Number.isFinite(Date.parse(post.last_edited_time))
        ? { lastModified: post.last_edited_time }
        : {}),
      alternates: {
        languages: Object.fromEntries(
          translations.map(other => [other.language, `${SITE_URL}/${other.language}${path}`])
        ),
      },
    });
  }
  return result;
}
