export type LocalizedText = { zh: string; en: string };
export type GuideSection = {
  id: string;
  title: LocalizedText;
  body: LocalizedText;
  aliases: LocalizedText;
  sourceRefs: string[];
  officialRefs?: string[];
  jurisdictions: string[];
  evidence: 'editorial-guide' | 'historical-example' | 'official-rule';
};
export type GuideModule = {
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  relatedPosts: string[];
  sections: GuideSection[];
};
