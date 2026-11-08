import type { AssistantEvidence } from './contracts';

type ListingSource = Extract<AssistantEvidence, { kind: 'listings' }>;
type Locale = 'zh' | 'en';
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

function listingSummary(source: ListingSource, locale: Locale) {
  const area = source.suburb ? source.suburb + ' · ' + source.school : source.school;
  const zh = locale === 'zh';
  const aud = (amount: number) => 'A$' + amount.toLocaleString('en-AU');
  const matches =
    source.matches === null
      ? zh
        ? '已找到房源样本'
        : 'Listing examples available'
      : zh
        ? source.matches + ' 条匹配房源'
        : source.matches + ' matching listings';
  const rent =
    source.averageWeeklyRent === null
      ? ''
      : zh
        ? '，平均周租 ' + aud(source.averageWeeklyRent)
        : ', averaging ' + aud(source.averageWeeklyRent) + '/week';
  return '- **' + area + '** · ' + matches + rent + ' [' + source.id + ']';
}

function listingAnswer(listings: ListingSource[], locale: Locale) {
  const zh = locale === 'zh';
  if (listings.every(item => item.matches === 0))
    return (
      (zh
        ? 'QRent 当前没有符合这些筛选条件的房源。 '
        : 'QRent has no listings that match these filters. ') +
      listings.map(item => '[' + item.id + ']').join(' ')
    );

  const summary = listings.map(item => listingSummary(item, locale)).join('\n');
  const priced = listings
    .filter(item => item.averageWeeklyRent !== null)
    .sort((a, b) => a.averageWeeklyRent! - b.averageWeeklyRent!);
  const [lowest, next] = priced;
  if (!lowest?.suburb || !next || lowest.averageWeeklyRent === next.averageWeeklyRent)
    return summary;
  const recommendation = zh
    ? '如果优先控制周租，可以先看 ' + lowest.suburb + '，这次匹配房源的平均周租更低。'
    : 'If weekly rent is your priority, start with ' +
      lowest.suburb +
      '. It has a lower average asking rent among these matches.';
  return summary + '\n\n' + recommendation + ' [' + lowest.id + ']';
}

export function formatRentalAnswer(
  rawText: string,
  evidence: AssistantEvidence[],
  locale: Locale,
  userText: string
) {
  const listings = evidence.filter(item => item.kind === 'listings');
  const draft =
    listings.length || currency.test(userText) || userRent.test(userText)
      ? rawText
      : removeUnrequestedPrices(rawText);
  const text = draft.replace(
    /\[(?:sources?|来源)\s*[:：]\s*((?:[RG]\d+)(?:\s*[,，、]\s*[RG]\d+)*)\]|【([RG]\d+)】/gi,
    (_marker, group: string | undefined, single: string | undefined) =>
      ((group ?? single)?.match(/[RG]\d+/gi) ?? [])
        .map(id => '[' + id.toUpperCase() + ']')
        .join(' ')
  );
  const guides = evidence.filter(item => item.kind === 'guide');
  const guideText = listings.length
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

  return [listings.length ? listingAnswer(listings, locale) : '', guidance]
    .filter(Boolean)
    .join('\n\n');
}
