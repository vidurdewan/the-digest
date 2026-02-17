export type Theme = "light" | "dark" | "newspaper";

export type TopicCategory =
  | "vc-startups"
  | "fundraising-acquisitions"
  | "executive-movements"
  | "financial-markets"
  | "geopolitics"
  | "automotive"
  | "science-tech"
  | "local-news"
  | "politics";

export type InterestLevel = "high" | "medium" | "low" | "hidden";

export type SourceTier = 1 | 2 | 3;

export type DocumentType = '8-K' | 'S-1' | '10-K' | 'fed-release';

export interface DecipheringSummary {
  theFiling: string;
  whatChanged: string;
  whatsBuried: string;
  whatTheJargonMeans: string;
  theRealStory: string;
  watchNext: string;
}

export interface Article {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  author?: string;
  publishedAt: string;
  topic: TopicCategory;
  content?: string;
  imageUrl?: string;
  readingTimeMinutes: number;
  isRead: boolean;
  isSaved: boolean;
  watchlistMatches: string[];
  sourceTier?: SourceTier;
  rankingScore?: number;
  documentType?: DocumentType;
}

export interface Summary {
  id: string;
  articleId: string;
  brief: string;
  theNews: string;
  whyItMatters: string;
  theContext: string;
  keyEntities: Entity[];
  deciphering?: DecipheringSummary;
  generatedAt: string;
}

export interface Entity {
  name: string;
  type: "company" | "person" | "fund" | "keyword";
}

export interface NewsletterSummary {
  theNews: string;
  whyItMatters: string;
  theContext: string;
  soWhat: string;
  watchNext: string;
  recruiterRelevance: string;
}

export interface Newsletter {
  id: string;
  publication: string;
  subject: string;
  receivedAt: string;
  content: string;
  summary?: Summary;
  newsletterSummary?: NewsletterSummary;
  isRead: boolean;
  isSaved?: boolean;
  readingTimeMinutes?: number;
  sourceTier?: SourceTier;
}

export interface WatchlistItem {
  id: string;
  name: string;
  type: "company" | "fund" | "person" | "keyword";
  createdAt: string;
}

export interface UserSettings {
  theme: Theme;
  topicPreferences: Record<TopicCategory, InterestLevel>;
  notificationsEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  vipNewsletters: string[];
}

export interface NavigationSection {
  id: string;
  label: string;
  icon: string;
  path: string;
}

// ─── Intelligence Types ──────────────────────────────────────

export type StoryType = 'breaking' | 'developing' | 'analysis' | 'opinion' | 'feature' | 'update';

export type SignificanceLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface ArticleConnection {
  articleId: string;
  articleTitle: string;
  reason: string;
  strength: 'strong' | 'moderate' | 'weak';
}

export interface ArticleIntelligence {
  significanceScore: SignificanceLevel;
  storyType: StoryType;
  connectsTo: ArticleConnection[];
  storyThreadId?: string;
  watchForNext?: string;
  isSurpriseCandidate: boolean;
}

export interface StoryThread {
  id: string;
  title: string;
  summary?: string;
  firstSeenAt: string;
  lastUpdatedAt: string;
  articleCount: number;
  status: 'active' | 'resolved' | 'stale';
}

export type ReactionType = 'already_knew' | 'useful' | 'surprising' | 'bad_connection' | 'not_important';

export interface ArticleReaction {
  id: string;
  articleId: string;
  reaction: ReactionType;
  createdAt: string;
}

export interface Reminder {
  id: string;
  articleId: string;
  remindAt: string;
  note?: string;
  isDismissed: boolean;
}

export interface WeeklySynthesis {
  id: string;
  weekStart: string;
  weekEnd: string;
  synthesis: string;
  threads: StoryThread[];
  patterns: string[];
  generatedAt: string;
}

export interface MorningBriefingThread {
  title: string;
  summary: string;
  articleCount: number;
  urgency: "high" | "medium" | "low";
}

export interface MorningBriefing {
  since: string;
  generatedAt: string;
  summary: string;
  whatChanged: string[];
  actionItems: string[];
  threads: MorningBriefingThread[];
}

export type FeedTier = 'start-here' | 'also-notable' | 'everything-else';

// ─── Since Last Read Types ───────────────────────────────────

export type ContinuityDepth = '2m' | '10m' | 'deep';

export interface SinceLastReadHighlight {
  articleId: string;
  title: string;
  source: string;
  sourceUrl: string;
  topic: TopicCategory;
  publishedAt: string;
  significanceScore: number;
  watchlistMatches: string[];
  reason: string;
  watchForNext?: string;
}

export interface SinceLastReadCitation {
  articleId: string;
  title: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
}

export interface SinceLastReadBrief {
  headline: string;
  summary: string;
  changed: string[];
  unchanged: string[];
  watchNext: string[];
}

export interface SinceLastReadPayload {
  state: {
    clientId: string;
    depth: ContinuityDepth;
    lastSeenAt: string | null;
    sinceAt: string;
    untilAt: string;
    isFirstVisit: boolean;
    cached: boolean;
    snapshotHash: string;
  };
  counts: {
    newArticles: number;
    newThreads: number;
    watchlistHits: number;
  };
  highlights: SinceLastReadHighlight[];
  brief: SinceLastReadBrief;
  citations: SinceLastReadCitation[];
}

// ─── Signal Detection Types ──────────────────────────────────

export type SignalType =
  | 'first_mention'
  | 'tier1_before_mainstream'
  | 'convergence'
  | 'unusual_activity'
  | 'sentiment_shift';

export type SentimentLabel = 'positive' | 'negative' | 'neutral';

export interface ArticleSignal {
  id: string;
  articleId: string;
  signalType: SignalType;
  signalLabel: string;
  entityName?: string;
  confidence: number;
  metadata: Record<string, unknown>;
  detectedAt: string;
}

export const SIGNAL_LABELS: Record<SignalType, string> = {
  first_mention: 'New to your radar',
  tier1_before_mainstream: 'Early signal',
  convergence: 'Building momentum',
  unusual_activity: 'Unusual activity',
  sentiment_shift: 'Sentiment shift',
};

export type ArticleWithIntelligence = Article & {
  summary?: Summary;
  intelligence?: ArticleIntelligence;
  feedTier?: FeedTier;
  reactions?: ReactionType[];
  signals?: ArticleSignal[];
};
