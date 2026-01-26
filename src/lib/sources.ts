import type { TopicCategory } from "@/types";

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  type: "rss" | "api";
  topic: TopicCategory;
  isActive: boolean;
}

/**
 * Curated default sources covering all topic areas from the spec.
 */
export const defaultSources: NewsSource[] = [
  // ─── VC & Startups ─────────────────────────────────────
  {
    id: "techcrunch",
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    type: "rss",
    topic: "vc-startups",
    isActive: true,
  },
  {
    id: "strictlyvc",
    name: "StrictlyVC",
    url: "https://strictlyvc.com/feed/",
    type: "rss",
    topic: "vc-startups",
    isActive: true,
  },
  {
    id: "venturebeat",
    name: "VentureBeat",
    url: "https://venturebeat.com/feed/",
    type: "rss",
    topic: "vc-startups",
    isActive: true,
  },
  {
    id: "crunchbase",
    name: "Crunchbase News",
    url: "https://news.crunchbase.com/feed/",
    type: "rss",
    topic: "vc-startups",
    isActive: true,
  },

  // ─── Fundraising & Acquisitions ────────────────────────
  {
    id: "fortune-termsheet",
    name: "Fortune",
    url: "https://fortune.com/feed/",
    type: "rss",
    topic: "fundraising-acquisitions",
    isActive: true,
  },

  // ─── Executive Movements ───────────────────────────────
  {
    id: "newsapi-exec",
    name: "Executive Moves (NewsAPI)",
    url: "executive+appointment+OR+CEO+hire+OR+CTO+joins",
    type: "api",
    topic: "executive-movements",
    isActive: true,
  },

  // ─── Financial Markets ─────────────────────────────────
  {
    id: "reuters-business",
    name: "Reuters Business",
    url: "https://www.reutersagency.com/feed/?best-topics=business-finance",
    type: "rss",
    topic: "financial-markets",
    isActive: true,
  },
  {
    id: "cnbc",
    name: "CNBC",
    url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147",
    type: "rss",
    topic: "financial-markets",
    isActive: true,
  },
  {
    id: "marketwatch",
    name: "MarketWatch",
    url: "https://feeds.marketwatch.com/marketwatch/topstories/",
    type: "rss",
    topic: "financial-markets",
    isActive: true,
  },

  // ─── Geopolitics ───────────────────────────────────────
  {
    id: "ap-world",
    name: "AP World News",
    url: "https://rsshub.app/apnews/topics/world-news",
    type: "rss",
    topic: "geopolitics",
    isActive: true,
  },
  {
    id: "reuters-world",
    name: "Reuters World",
    url: "https://www.reutersagency.com/feed/?best-topics=world",
    type: "rss",
    topic: "geopolitics",
    isActive: true,
  },

  // ─── Science & Tech ────────────────────────────────────
  {
    id: "arstechnica",
    name: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    type: "rss",
    topic: "science-tech",
    isActive: true,
  },
  {
    id: "wired",
    name: "Wired",
    url: "https://www.wired.com/feed/rss",
    type: "rss",
    topic: "science-tech",
    isActive: true,
  },
  {
    id: "mit-tech-review",
    name: "MIT Tech Review",
    url: "https://www.technologyreview.com/feed/",
    type: "rss",
    topic: "science-tech",
    isActive: true,
  },
  {
    id: "theverge",
    name: "The Verge",
    url: "https://www.theverge.com/rss/index.xml",
    type: "rss",
    topic: "science-tech",
    isActive: true,
  },

  // ─── Automotive ────────────────────────────────────────
  {
    id: "newsapi-auto",
    name: "Automotive News (NewsAPI)",
    url: "electric+vehicle+OR+autonomous+driving+OR+automotive+industry",
    type: "api",
    topic: "automotive",
    isActive: true,
  },
  {
    id: "electrek",
    name: "Electrek",
    url: "https://electrek.co/feed/",
    type: "rss",
    topic: "automotive",
    isActive: true,
  },

  // ─── Local News ────────────────────────────────────────
  {
    id: "newsapi-local",
    name: "San Francisco News (NewsAPI)",
    url: "San+Francisco+OR+Bay+Area",
    type: "api",
    topic: "local-news",
    isActive: true,
  },

  // ─── Politics ──────────────────────────────────────────
  {
    id: "politico",
    name: "Politico",
    url: "https://rss.politico.com/politics-news.xml",
    type: "rss",
    topic: "politics",
    isActive: true,
  },
  {
    id: "axios",
    name: "Axios",
    url: "https://api.axios.com/feed/",
    type: "rss",
    topic: "politics",
    isActive: true,
  },
  {
    id: "ap-politics",
    name: "AP Politics",
    url: "https://rsshub.app/apnews/topics/politics",
    type: "rss",
    topic: "politics",
    isActive: true,
  },
];

/**
 * Get all active sources, optionally filtered by type.
 */
export function getActiveSources(type?: "rss" | "api"): NewsSource[] {
  let sources = defaultSources.filter((s) => s.isActive);
  if (type) {
    sources = sources.filter((s) => s.type === type);
  }
  return sources;
}

/**
 * Get sources by topic.
 */
export function getSourcesByTopic(topic: TopicCategory): NewsSource[] {
  return defaultSources.filter((s) => s.topic === topic && s.isActive);
}
