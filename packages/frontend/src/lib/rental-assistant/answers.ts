import type { AssistantEvidence } from './contracts';

type ListingSource = Extract<AssistantEvidence, { kind: 'listings' }>;
type Locale = 'zh' | 'en';
type ListingLookup = { requested: boolean; failed: boolean; failedAreas: string[] };
const currency = /(?:A?\$\s*\d|\d\s*(?:AUD|澳元))/i;
const userRent = /(?:周租|预算|每周|budget|rent)\D{0,12}\d/i;

function removeUnrequestedPrices(text: string) {
  const withoutExamples = text.replace(/[（(]([^()（）\n]+)[）)]/g, (group, example: string) =>
    currency.test(example) ? '' : group
  );
  return withoutExamples
    .split('\n')
    .filter(line => !currency.test(line))
    .join('\n')
    .trim();
}

function dollars(amount: number) {
  return 'A$' + amount.toLocaleString('en-AU', { maximumFractionDigits: 2 });
}

function listingSummary(source: ListingSource, locale: Locale) {
  const area = source.suburb ? source.suburb + ' · ' + source.school : source.school;
  const zh = locale === 'zh';
  const bedrooms = source.filters.bedrooms
    ? zh
      ? source.filters.bedrooms + ' 房'
      : source.filters.bedrooms + ' bed'
    : '';
  const { minRent, maxRent } = source.filters;
  const cap =
    minRent && maxRent
      ? (zh ? '整套 ' : 'whole property ') +
        dollars(minRent) +
        '–' +
        dollars(maxRent) +
        (zh ? '/周' : '/week')
      : maxRent
        ? (zh ? '整套上限 ' : 'whole-property cap ') + dollars(maxRent) + (zh ? '/周' : '/week')
        : '';
  const limit = source.filters.maxCommute
    ? zh
      ? '公交 ≤' + source.filters.maxCommute + ' 分钟'
      : 'transit ≤' + source.filters.maxCommute + ' min'
    : '';
  const labels = [area, bedrooms, cap, limit].filter(Boolean).join(' · ');
  const matches =
    source.matches === null
      ? zh
        ? '匹配数量暂不可用'
        : 'Match count is unavailable'
      : zh
        ? source.matches + ' 条匹配房源'
        : source.matches + ' matching listings';
  const average = source.averageWeeklyRent;
  const rent =
    average === null
      ? ''
      : zh
        ? '，平均周租 ' + dollars(average)
        : ', averaging ' + dollars(average) + '/week';
  const split = source.split;
  const perPerson =
    split && average !== null
      ? zh
        ? '，' + split.occupants + ' 人均分约 ' + dollars(average / split.occupants) + '/人/周'
        : ', about ' + dollars(average / split.occupants) + ' each/week for ' + split.occupants
      : '';
  return '- **' + labels + '** · ' + matches + rent + perPerson + ' [' + source.id + ']';
}

function listingAnswer(listings: ListingSource[], locale: Locale, incomplete: boolean) {
  const zh = locale === 'zh';
  const noMatches = !incomplete && listings.every(item => item.matches === 0);
  const splits = listings.flatMap(item => (item.split ? [item.split] : []));
  const shared = splits[0];
  const sharedNote = shared
    ? zh
      ? '按每人每周 ' +
        dollars(shared.perPersonRent) +
        ' 算整套预算。' +
        (splits.some(split => split.assumed) ? '人数未指定的户型按一人一间卧室估算。' : '')
      : 'Whole-property caps use ' +
        dollars(shared.perPersonRent) +
        ' per person per week.' +
        (splits.some(split => split.assumed)
          ? ' Where headcount is unspecified, I assumed one person per bedroom.'
          : '')
    : '';
  const summary = listings.map(item => listingSummary(item, locale)).join('\n');
  const intro = noMatches
    ? zh
      ? 'Qrent 当前没有符合这些筛选条件的房源。可以先考虑放宽区域或通勤范围。'
      : 'Qrent has no listings that match these filters. Consider a wider area or commute range.'
    : '';
  const priceComparisons = listings
    .filter(item => item.averageWeeklyRent !== null)
    .sort((a, b) => a.averageWeeklyRent! - b.averageWeeklyRent!);
  const [lowest, next] = priceComparisons;
  const comparable =
    lowest?.suburb &&
    next &&
    lowest.suburb !== next.suburb &&
    lowest.school === next.school &&
    lowest.averageWeeklyRent !== next.averageWeeklyRent &&
    priceComparisons.every(item => JSON.stringify(item.filters) === JSON.stringify(lowest.filters));
  const recommendation =
    !incomplete && comparable
      ? zh
        ? '如果优先控制周租，可以先看 ' +
          lowest.suburb +
          '，这次匹配房源的平均周租更低。 [' +
          lowest.id +
          ']'
        : 'If weekly rent is your priority, start with ' +
          lowest.suburb +
          '. It has a lower average asking rent among these matches. [' +
          lowest.id +
          ']'
      : '';
  return [sharedNote, intro, summary, recommendation].filter(Boolean).join('\n\n');
}

export function formatRentalAnswer(
  rawText: string,
  evidence: AssistantEvidence[],
  locale: Locale,
  userText: string,
  lookup?: ListingLookup
) {
  const listings = evidence.filter(item => item.kind === 'listings');
  const draft =
    listings.length || currency.test(userText) || userRent.test(userText)
      ? rawText
      : removeUnrequestedPrices(rawText);
  const text = draft
    .replace(/\[([RG]\d+)\]\(#[^)]*\)/gi, '[$1]')
    .replace(
      /\[(?:sources?|来源)\s*[:：]\s*((?:[RG]\d+)(?:\s*[,，、]\s*[RG]\d+)*)\]|【([RG]\d+)】/gi,
      (_marker, group: string | undefined, single: string | undefined) =>
        ((group ?? single)?.match(/[RG]\d+/gi) ?? [])
          .map(id => '[' + id.toUpperCase() + ']')
          .join(' ')
    );
  const guides = evidence.filter(item => item.kind === 'guide');
  const incomplete = Boolean(lookup?.failed || (lookup?.requested && !listings.length));
  const guideText =
    listings.length || lookup?.requested
      ? text
          .split('\n')
          .filter(line => /\[G\d+\]/.test(line) && !/\[R\d+\]/.test(line) && !currency.test(line))
          .join('\n\n')
      : text;
  const citations = [...guideText.matchAll(/\[([RG]\d+)\]/g)].map(match => match[1]);
  const valid = citations.every(id => guides.some(item => item.id === id));
  const guidance =
    guideText && valid && (!guides.length || citations.length)
      ? guideText
      : guides
          .slice(0, 2)
          .map(item => '**' + item.heading + '** [' + item.id + ']\n\n' + item.text)
          .join('\n\n');

  let lookupNotice = '';
  if (incomplete) {
    const areas = lookup?.failedAreas.join(locale === 'zh' ? '、' : ', ');
    lookupNotice = areas
      ? locale === 'zh'
        ? '这次未能核对 ' + areas + ' 的 Qrent 房源数据。'
        : 'Qrent could not verify listings for ' + areas + '.'
      : locale === 'zh'
        ? '这次未能取得可核对的房源数据。请确认学校或区名后重试。'
        : 'Qrent could not verify listing data. Check the campus or suburb and try again.';
  }

  return [
    listings.length ? listingAnswer(listings, locale, incomplete) : '',
    lookupNotice,
    guidance,
  ]
    .filter(Boolean)
    .join('\n\n');
}
