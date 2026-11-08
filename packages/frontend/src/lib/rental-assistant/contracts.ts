import type { ListingInput } from './listings';
import type { ModelProvider } from './presets';

export type ListingExample = {
  id: number;
  address: string;
  region: string;
  weeklyRent: number;
  bedrooms: number;
  commuteMinutes: number | null;
  publishedAt: string;
  url: string;
};

export type ListingComparison = {
  school: 'UNSW' | 'USYD' | 'UTS';
  suburb: string | null;
  matches: number | null;
  averageWeeklyRent: number | null;
  examples: ListingExample[];
  readAt: string;
  filters: { minRent?: number; maxRent?: number; bedrooms?: number; maxCommute?: number };
};

export type GuidePassage = {
  sourceKind: 'experience' | 'handbook';
  path: string;
  article: string;
  heading: string;
  text: string;
  publishedAt: string;
  reviewedAt?: string;
  jurisdictions?: readonly string[];
};

export type AssistantEvidence =
  | ({ id: string; kind: 'listings' } & ListingComparison)
  | ({ id: string; kind: 'guide' } & GuidePassage);

export type ModelConnection =
  | { type: 'local' }
  | { type: 'preset'; provider: ModelProvider; apiKey: string }
  | { type: 'compatible'; baseUrl: string; model: string; apiKey: string };

export type ChatReply = {
  answer: string;
  evidence: AssistantEvidence[];
  search?: ListingInput;
  reviewId?: string;
};
