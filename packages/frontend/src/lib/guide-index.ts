import { pairedGuides } from './paired-guides';
import {
  plainGuideText,
  rentalGuideModules,
  RENTAL_LIBRARY_PUBLISHED_AT,
  type LibraryLocale,
} from './rental-library';

export type GuideIndexEntry = {
  id: string;
  path: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  topics: string[];
  keywords: string;
  searchText: string;
};

const topics = {
  'budget-and-housing': { zh: '准备与预算', en: 'Preparation & budget' },
  'areas-and-commute': { zh: '选区与通勤', en: 'Areas & commutes' },
  'platforms-and-search': { zh: '平台与筛选', en: 'Platforms & search' },
  'application-documents': { zh: '材料与申请', en: 'Documents & applications' },
  'inspection-checklist': { zh: '看房与防骗', en: 'Inspections & safety' },
  'contracts-and-bond': { zh: '合同与押金', en: 'Leases & bonds' },
  'moving-in': { zh: '入住与账单', en: 'Moving in & bills' },
  'repairs-and-moving-out': { zh: '维修与退租', en: 'Repairs & moving out' },
} as const;

type TopicId = keyof typeof topics;
const experienceTopics: Record<string, TopicId[]> = {
  'shared-vs-private-renting': ['budget-and-housing'],
  'types-of-apartments': ['budget-and-housing'],
  'when-to-start-rental-search': ['budget-and-housing'],
  'rental-platforms-from-overseas': ['platforms-and-search', 'budget-and-housing'],
  'rental-suburbs-platforms': ['areas-and-commute', 'platforms-and-search'],
  'rental-application-australia': ['application-documents'],
  'rental-application-results': ['application-documents'],
  'rental-history-guarantor': ['application-documents'],
  'available-date-rental-cover-letter': ['application-documents'],
  'rental-inspection': ['inspection-checklist'],
};

function topicLabels(ids: string[], locale: LibraryLocale) {
  return ids.map(id => {
    const topic = topics[id as TopicId];
    if (!topic) throw new Error(`Classify the rental guide topic before publishing: ${id}`);
    return topic[locale];
  });
}

/** Build on the server; send only the selected language's searchable body. */
export function getGuideIndexEntries(locale: LibraryLocale): GuideIndexEntry[] {
  const articles = pairedGuides
    .filter(entry => entry.post.language === locale)
    .map(({ post, blocks }) => {
      const ids = experienceTopics[post.slug];
      if (!ids) throw new Error(`Classify the rental guide before publishing: ${post.slug}`);
      const excerpt = locale === 'zh' ? post.excerpt_zh : post.excerpt_en;
      return {
        id: `experience:${post.slug}`,
        path: `/${locale}/blog/${post.slug}`,
        title: locale === 'zh' ? post.title : post.title_en,
        excerpt,
        publishedAt: post.published_at,
        topics: topicLabels(ids, locale),
        keywords: [
          post.title,
          post.title_en,
          ...post.keywords,
          ...topicLabels(ids, 'zh'),
          ...topicLabels(ids, 'en'),
        ].join(' '),
        searchText: plainGuideText(
          [excerpt, ...blocks.map(block => String(block.content ?? ''))].join('\n')
        ),
      };
    });
  const sourceArticles = rentalGuideModules.map(module => ({
    id: `source:${module.slug}`,
    path: `/${locale}/guides/${module.slug}`,
    title: module.title[locale],
    excerpt: module.summary[locale],
    publishedAt: RENTAL_LIBRARY_PUBLISHED_AT,
    topics: topicLabels([module.slug], locale),
    keywords: [
      module.title.zh,
      module.title.en,
      ...topicLabels([module.slug], 'zh'),
      ...topicLabels([module.slug], 'en'),
      ...module.sections.flatMap(section => [section.aliases.zh, section.aliases.en]),
    ].join(' '),
    searchText: plainGuideText(
      [
        module.summary[locale],
        ...module.sections.map(section => `${section.title[locale]}\n${section.body[locale]}`),
      ].join('\n')
    ),
  }));
  return [...sourceArticles, ...articles];
}

export function getGuideIndexTopics(entries: GuideIndexEntry[], locale: LibraryLocale) {
  return Object.values(topics).map(topic => ({
    name: topic[locale],
    count: entries.filter(entry => entry.topics.includes(topic[locale])).length,
  }));
}
