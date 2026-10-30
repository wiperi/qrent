import manifest from '../content/guides/manifest.json';
import type { BlogPost } from './notion';
import type { NotionBlock } from '@/types/blog';
import { mainGuideBody } from './guide-body';
import zh0 from '../content/guides/zh/shared-vs-private-renting.json';
import en0 from '../content/guides/en/shared-vs-private-renting.json';
import zh1 from '../content/guides/zh/rental-application-australia.json';
import en1 from '../content/guides/en/rental-application-australia.json';
import zh2 from '../content/guides/zh/types-of-apartments.json';
import en2 from '../content/guides/en/types-of-apartments.json';
import zh3 from '../content/guides/zh/rental-platforms-from-overseas.json';
import en3 from '../content/guides/en/rental-platforms-from-overseas.json';
import zh4 from '../content/guides/zh/rental-suburbs-platforms.json';
import en4 from '../content/guides/en/rental-suburbs-platforms.json';
import zh5 from '../content/guides/zh/when-to-start-rental-search.json';
import en5 from '../content/guides/en/when-to-start-rental-search.json';
import zh6 from '../content/guides/zh/rental-application-results.json';
import en6 from '../content/guides/en/rental-application-results.json';
import zh7 from '../content/guides/zh/available-date-rental-cover-letter.json';
import en7 from '../content/guides/en/available-date-rental-cover-letter.json';
import zh8 from '../content/guides/zh/rental-history-guarantor.json';
import en8 from '../content/guides/en/rental-history-guarantor.json';
import zh9 from '../content/guides/zh/rental-inspection.json';
import en9 from '../content/guides/en/rental-inspection.json';

// One publication unit contains both full bodies. No request-time translation.
const documents = [
  { zh: zh0, en: en0 },
  { zh: zh1, en: en1 },
  { zh: zh2, en: en2 },
  { zh: zh3, en: en3 },
  { zh: zh4, en: en4 },
  { zh: zh5, en: en5 },
  { zh: zh6, en: en6 },
  { zh: zh7, en: en7 },
  { zh: zh8, en: en8 },
  { zh: zh9, en: en9 },
];

export const pairedGuides = manifest
  .flatMap((source, index) => {
    const document = documents[index];
    return (['zh', 'en'] as const).map(language => ({
      post: {
        id: `${source.id}:${language}`,
        translation_group: source.id,
        slug: source.slug,
        title: document.zh.title,
        title_en: document.en.title,
        excerpt_zh: document.zh.excerpt,
        excerpt_en: document.en.excerpt,
        language,
        keywords: language === 'en' ? document.en.keywords : source.keywords,
        published_at: source.publishedAt,
        created_time: source.createdAt,
        last_edited_time: source.reviewedAt,
        status: 'Published',
        url: `https://www.notion.so/${source.id.replaceAll('-', '')}`,
      } satisfies BlogPost & { translation_group: string },
      blocks: [
        {
          id: `${source.id}:${language}:body`,
          type: 'markdown',
          has_children: false,
          content: mainGuideBody(document[language].content),
        },
      ] satisfies NotionBlock[],
    }));
  })
  .sort((a, b) => Date.parse(b.post.published_at) - Date.parse(a.post.published_at));
