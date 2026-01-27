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
}

export interface Summary {
  id: string;
  articleId: string;
  brief: string;
  theNews: string;
  whyItMatters: string;
  theContext: string;
  keyEntities: Entity[];
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

export type FeedTier = 'start-here' | 'also-notable' | 'everything-else';

export type ArticleWithIntelligence = Article & {
  summary?: Summary;
  intelligence?: ArticleIntelligence;
  feedTier?: FeedTier;
  reactions?: ReactionType[];
};
