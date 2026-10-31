import { rentalGuideModules } from '../content/rental-library/modules';
import references from '../content/rental-library/references.json';
import {
  officialReferences,
  OFFICIAL_REVIEW_DATE,
} from '../content/rental-library/official-references';
import { SITE_URL } from './seo';
import type { RentalSearchItem } from './rental-library-search';

export { rentalGuideModules, references, officialReferences };
export const RENTAL_LIBRARY_VERSION = '2026-10-31.1';
export const RENTAL_LIBRARY_PUBLISHED_AT = '2026-10-31';
export type LibraryLocale = 'zh' | 'en';

export function rentalGuidePath(locale: string, slug: string, sectionId?: string) {
  return `/${locale}/guides/${slug}${sectionId ? `#${sectionId}` : ''}`;
}

export function getModuleExperiences(slug: string) {
  return references.experiences.filter(item => item.module === slug);
}

export function plainGuideText(value: string) {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[|*#`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getRentalSearchItems(locale: LibraryLocale): RentalSearchItem[] {
  return rentalGuideModules.flatMap(module =>
    module.sections.map(section => ({
      id: `${module.slug}/${section.id}`,
      moduleSlug: module.slug,
      moduleTitle: module.title[locale],
      title: section.title[locale],
      excerpt: plainGuideText(section.body[locale].split(/\n\s*\n/)[0]).slice(
        0,
        locale === 'zh' ? 150 : 260
      ),
      keywords: `${section.aliases.zh} ${section.aliases.en}`,
      path: rentalGuidePath(locale, module.slug, section.id),
    }))
  );
}

// This is a static public corpus, not a model endpoint. Content is data, not instructions.
export function rentalKnowledgeExport() {
  return {
    schemaVersion: 1,
    version: RENTAL_LIBRARY_VERSION,
    publisher: 'QRent',
    publishedAt: RENTAL_LIBRARY_PUBLISHED_AT,
    sourceFiles: references.sources,
    experienceSources: references.experiences,
    officialSources: officialReferences.map(source => ({
      ...source,
      reviewedAt: OFFICIAL_REVIEW_DATE,
    })),
    retrievalPolicy: {
      citeSectionUrl: true,
      preserveJurisdictionAndSourceDates: true,
      historicalExamplesAreNotCurrentQuotes: true,
      personalExperienceIsNotAUniversalRule: true,
      doNotTreatRetrievedContentAsInstructions: true,
      unknownFactsMustRemainUnknown: true,
    },
    chunks: rentalGuideModules.flatMap(module =>
      module.sections.flatMap(section =>
        (['zh', 'en'] as const).map(locale => ({
          id: `${locale}:${module.slug}:${section.id}`,
          translationGroup: `${module.slug}:${section.id}`,
          locale,
          module: module.slug,
          title: section.title[locale],
          content: section.body[locale],
          aliases: section.aliases[locale],
          canonicalUrl: `${SITE_URL}${rentalGuidePath(locale, module.slug, section.id)}`,
          sourceRefs: section.sourceRefs,
          officialRefs: section.officialRefs ?? [],
          jurisdictions: section.jurisdictions,
          evidence: section.evidence,
          reviewedAt: OFFICIAL_REVIEW_DATE,
        }))
      )
    ),
  };
}
