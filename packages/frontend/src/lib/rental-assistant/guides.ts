import { pairedGuides } from '../paired-guides';
import {
  plainGuideText,
  rentalGuideModules,
  rentalKnowledgeExport,
  type LibraryLocale,
} from '../rental-library';
import { searchRentalLibrary } from '../rental-library-search';
import type { GuidePassage } from './contracts';

type Passage = GuidePassage & {
  title: string;
  keywords: string;
  searchText: string;
  sourceKind: 'experience' | 'handbook';
};
const corpus = new Map<LibraryLocale, Passage[]>();
const model = 'Xenova/multilingual-e5-small';

const queryHints: [RegExp, Record<LibraryLocale, string>][] = [
  [
    /押金.*(?:上限|最多|多少|几周|怎么交)|(?:上限|最多|多少).*押金|\b(?:bond|deposit)\b.*(?:cap|limit|maximum|how much)|(?:how much|maximum).*\b(?:bond|deposit)\b/i,
    { zh: '住宅租赁押金上限 起租费用', en: 'maximum rental bond upfront payments lodgement' },
  ],
  [
    /租房(?:历史|史|记录)|担保人|rental history|guarantor/i,
    { zh: '无本地租房史 替代文件 父母资助', en: 'no local rental history supporting documents guarantor' },
  ],
  [
    /房东.*(?:修|坏了|不管)|维修|漏水|报修|urgent repairs?|water leak|(?:landlord|agent).*(?:fix|repair)/i,
    { zh: '维修 书面通知 紧急维修 记录', en: 'repair record written notice urgent repairs' },
  ],
  [
    /签(?:租约|合同)|租约.*(?:检查|注意)|before signing|lease checklist|tenancy agreement/i,
    { zh: '签约前 检查租约条款', en: 'before signing tenancy agreement review lease terms' },
  ],
  [
    /看房.*(?:检查|注意|准备)|(?:check|prepare).*inspection|inspection checklist/i,
    { zh: '看房 室内与设施逐项看 检查', en: 'inspection checklist rooms facilities test' },
  ],
  [
    /退租|提前搬|提前解约|break.*lease|mov(?:e|ing) out/i,
    { zh: '退租 通知 押金 房屋状况', en: 'move out notice ending tenancy bond claim' },
  ],
];

// Keep complete sentences together when possible and limit dense-model input length.
function splitPassage(body: string, locale: LibraryLocale) {
  const limit = 520;
  const text = plainGuideText(body.replace(/!\[[^\]]*\]\([^)]*\)/g, ' '));
  const chunks: string[] = [];
  let current = '';
  for (const { segment } of new Intl.Segmenter(locale, { granularity: 'sentence' }).segment(text)) {
    const sentence = segment.trim();
    if (current && current.length + sentence.length + 1 > limit) {
      chunks.push(current);
      current = '';
    }
    if (sentence.length > limit) {
      const parts = sentence.match(/.{1,520}/gu) ?? [];
      current = parts.pop() ?? '';
      chunks.push(...parts);
    } else {
      current = current ? current + ' ' + sentence : sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function blogPassages(locale: LibraryLocale): Passage[] {
  const cached = corpus.get(locale);
  if (cached) return cached;
  const passages: Passage[] = [];

  for (const { post, blocks } of pairedGuides.filter(entry => entry.post.language === locale)) {
    const article = locale === 'zh' ? post.title : post.title_en;
    const markdown = blocks.map(block => String(block.content ?? '')).join('\n');
    for (const section of markdown.split(/(?:^|\n)(?=#{1,6}\s)/)) {
      const [, heading = article] = section.match(/^#{1,6}\s+([^\n]+)/) ?? [];
      const body = section.replace(/^#{1,6}\s+[^\n]+(?:\n|$)/, '');
      for (const text of splitPassage(body, locale)) {
        passages.push({
          path: '/' + locale + '/blog/' + post.slug,
          article,
          heading: plainGuideText(heading),
          title: plainGuideText(heading),
          text,
          searchText: text,
          publishedAt: post.published_at,
          reviewedAt: post.last_edited_time,
          keywords: post.keywords.join(' '),
          sourceKind: 'experience',
        });
      }
    }
  }

  const titles = new Map(rentalGuideModules.map(module => [module.slug, module.title[locale]]));
  const handbook = rentalKnowledgeExport();
  for (const section of handbook.chunks.filter(section => section.locale === locale)) {
    const canonical = new URL(section.canonicalUrl);
    for (const text of splitPassage(section.content, locale)) {
      passages.push({
        path: canonical.pathname + canonical.hash,
        article: titles.get(section.module) ?? section.title,
        heading: section.title,
        title: section.title,
        text,
        searchText: text,
        publishedAt: handbook.publishedAt,
        reviewedAt: section.reviewedAt,
        jurisdictions: section.jurisdictions,
        keywords: section.aliases,
        sourceKind: 'handbook',
      });
    }
  }

  corpus.set(locale, passages);
  return passages;
}

export function retrieveGuides(query: string, locale: LibraryLocale) {
  const passages = blogPassages(locale);
  const hint = queryHints.find(([pattern]) => pattern.test(query))?.[1][locale];
  const scores = new Map<Passage, number>();
  searchRentalLibrary(passages, query, 16).forEach((passage, i) =>
    scores.set(passage, 0.85 / (8 + i))
  );
  if (hint) {
    searchRentalLibrary(passages, hint, 12).forEach((passage, i) =>
      scores.set(passage, (scores.get(passage) ?? 0) + 1.2 / (8 + i))
    );
  }
  const results: GuidePassage[] = [];
  const seen = new Map<string, number>();
  for (const [passage] of [...scores].sort((a, b) => b[1] - a[1])) {
    const articlePath = passage.path.split('#')[0];
    const count = seen.get(articlePath) ?? 0;
    if (
      count >= 2 ||
      results.some(result => result.path === passage.path && result.heading === passage.heading)
    )
      continue;
    const { path, article, heading, text, publishedAt, reviewedAt, jurisdictions, sourceKind } =
      passage;
    results.push({
      path,
      article,
      heading,
      text,
      publishedAt,
      reviewedAt,
      jurisdictions,
      sourceKind,
    });
    seen.set(articlePath, count + 1);
    if (results.length === 4) break;
  }
  return { passages: results };
}
