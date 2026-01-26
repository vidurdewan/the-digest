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

export interface Newsletter {
  id: string;
  publication: string;
  subject: string;
  receivedAt: string;
  content: string;
  summary?: Summary;
  isRead: boolean;
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
}

export interface NavigationSection {
  id: string;
  label: string;
  icon: string;
  path: string;
}
