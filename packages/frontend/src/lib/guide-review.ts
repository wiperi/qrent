import editorial from '../content/guides/editorial-review-20261031.json';

type Change = { before: string; after: string };
type GuideReview = {
  sourceHash: string;
  zh: Change[];
  en: Change[];
  excerpts?: { zh: string; en: string };
};
const reviews = new Map<string, GuideReview>(Object.entries(editorial.reviews));

export function guideReviewedAt(slug: string) {
  return reviews.has(slug) ? editorial.reviewedAt : undefined;
}

export function reviewedGuideExcerpt(slug: string, locale: 'zh' | 'en', original: string) {
  return reviews.get(slug)?.excerpts?.[locale] ?? original;
}

/** Original exports remain immutable; an ambiguous or stale correction blocks publication. */
export function reviewedGuideBody(
  slug: string,
  locale: 'zh' | 'en',
  sourceHash: string,
  original: string
) {
  const review = reviews.get(slug);
  if (!review) return original;
  if (review.sourceHash !== sourceHash) throw new Error(`Stale guide review: ${slug}`);
  return review[locale].reduce((body, change) => {
    if (!change.before || body.split(change.before).length !== 2) {
      throw new Error(`Ambiguous guide review: ${locale}/${slug}`);
    }
    return body.replace(change.before, change.after);
  }, original);
}
