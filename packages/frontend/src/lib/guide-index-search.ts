import type { GuideIndexEntry } from './guide-index';
import { searchRentalLibrary } from './rental-library-search';

export function filterGuideIndex(
  entries: GuideIndexEntry[],
  query: string,
  selectedTopics: string[]
) {
  const candidates = entries.filter(entry =>
    selectedTopics.every(topic => entry.topics.includes(topic))
  );
  if (!query.trim()) return candidates;
  return searchRentalLibrary(candidates, query, candidates.length);
}
