import { pairedGuides } from '../paired-guides';
import {
  plainGuideText,
  rentalGuideModules,
  rentalKnowledgeExport,
  type LibraryLocale,
} from '../rental-library';
import { searchRentalLibrary } from '../rental-library-search';
import type { GuidePassage } from './contracts';
import { faqSections } from './faq';

type Passage = GuidePassage & {
  title: string;
  keywords: string;
  searchText: string;
  sourceKind: 'experience' | 'handbook';
};
const corpus = new Map<LibraryLocale, Passage[]>();

const queryHints: [RegExp, Record<LibraryLocale, string>][] = [
  [
    /押金.*(?:上限|最多|多少|几周|怎么交)|(?:上限|最多|多少).*押金|\b(?:bond|deposit)\b.*(?:cap|limit|maximum|how much)|(?:how much|maximum).*\b(?:bond|deposit)\b/i,
    { zh: '住宅租赁押金上限 起租费用', en: 'maximum rental bond upfront payments lodgement' },
  ],
  [
    /租房(?:历史|史|记录)|担保人|rental history|guarantor/i,
    {
      zh: '无本地租房史 替代文件 父母资助',
      en: 'no local rental history supporting documents guarantor',
    },
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

// Keep complete sentences together and bound the amount of reference text sent to the model.
function splitPassage(body: string, locale: LibraryLocale) {
  const limit = 620;
  const text = plainGuideText(
    body
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/gm, '')
      .replace(/^\s*\|\s*(?:位置\s*\|\s*检查项目|Location\s*\|\s*What to check)\s*\|\s*$/gm, '')
  );
  const chunks: string[] = [];
  let current = '';
  for (const { segment } of new Intl.Segmenter(locale, { granularity: 'sentence' }).segment(text)) {
    const sentence = segment.trim();
    if (current && current.length + sentence.length + 1 > limit) {
      chunks.push(current);
      current = '';
    }
    if (sentence.length > limit) {
      const parts = sentence.match(new RegExp('.{1,' + limit + '}', 'gu')) ?? [];
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
        evidence: section.evidence,
      });
    }
  }

  corpus.set(locale, passages);
  return passages;
}

type GuideContext = { school?: string; previousUserQuestion?: string };

const states = {
  NSW: /\bNSW\b|New South Wales|新南威尔士|新州|悉尼|\bSydney\b/i,
  VIC: /\bVIC\b|\bVictoria\b|维州|维多利亚|墨尔本|\bMelbourne\b/i,
  ACT: /\bACT\b|Canberra|堪培拉/i,
  QLD: /\bQLD\b|Queensland|昆州|布里斯班|Brisbane/i,
  WA: /\bWA\b|Western Australia|西澳|珀斯|Perth/i,
  SA: /\bSA\b|South Australia|南澳|阿德莱德|Adelaide/i,
};

function namedStates(text: string) {
  return Object.entries(states)
    .filter(([, pattern]) => pattern.test(text))
    .map(([state]) => state);
}

export function retrieveGuides(query: string, locale: LibraryLocale, context?: GuideContext) {
  const q = query.normalize('NFKC');
  const explicitStates = namedStates(q);
  const inferredStates = namedStates(context?.previousUserQuestion ?? '');
  const jurisdictions = explicitStates.length
    ? explicitStates
    : inferredStates.length
      ? inferredStates
      : context?.school
        ? ['NSW']
        : [];
  const passages = blogPassages(locale).filter(
    passage =>
      !jurisdictions.length ||
      !passage.jurisdictions?.length ||
      passage.jurisdictions.includes('Australia') ||
      passage.jurisdictions.some(state =>
        jurisdictions.includes(state === 'Sydney' ? 'NSW' : state === 'Melbourne' ? 'VIC' : state)
      )
  );
  const hint = queryHints.find(([pattern]) => pattern.test(q))?.[1][locale];
  const scores = new Map<Passage, number>();
  searchRentalLibrary(passages, q, 16).forEach((passage, i) => scores.set(passage, 0.85 / (8 + i)));
  if (hint) {
    searchRentalLibrary(passages, hint, 12).forEach((passage, i) =>
      scores.set(passage, (scores.get(passage) ?? 0) + 1.2 / (8 + i))
    );
  }
  for (const [index, target] of faqSections(q).slice(0, 4).entries()) {
    const matches = passages.filter(passage => passage.path === '/' + locale + '/guides/' + target);
    const best = searchRentalLibrary(matches, q, 1)[0] ?? matches[0];
    if (best) scores.set(best, (scores.get(best) ?? 0) + 1 / (index + 1));
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
    const {
      path,
      article,
      heading,
      text,
      publishedAt,
      reviewedAt,
      jurisdictions,
      sourceKind,
      evidence,
    } = passage;
    results.push({
      path,
      article,
      heading,
      text,
      publishedAt,
      reviewedAt,
      jurisdictions,
      sourceKind,
      evidence,
    });
    seen.set(articlePath, count + 1);
    if (results.length === 4) break;
  }
  return { passages: results };
}
