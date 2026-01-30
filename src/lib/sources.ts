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
  {
    id: "puck-news",
    name: "Puck News",
    url: "https://puck.news/feed/",
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
    topic: "financial-markets",
    isActive: true,
  },
  {
    id: "newsapi-fundraising",
    name: "Fundraising & M&A (NewsAPI)",
    url: "acquisition+OR+merger+OR+%22funding+round%22+OR+%22Series+A%22+OR+%22Series+B%22+OR+IPO+filing",
    type: "api",
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
  {
    id: "bloomberg-markets",
    name: "Bloomberg Markets",
    url: "https://feeds.bloomberg.com/markets/news.rss",
    type: "rss",
    topic: "financial-markets",
    isActive: true,
  },

  // ─── SEC EDGAR (Primary Documents) ───────────────────
  {
    id: "sec-edgar-8k",
    name: "SEC EDGAR 8-K",
    url: "https://efts.sec.gov/LATEST/search-index?q=%228-K%22&dateRange=custom&startdt=2026-01-20&enddt=2026-01-27&forms=8-K&from=0&size=40",
    type: "rss",
    topic: "financial-markets",
    isActive: true,
  },
  {
    id: "sec-edgar-s1",
    name: "SEC EDGAR S-1",
    url: "https://efts.sec.gov/LATEST/search-index?q=%22S-1%22&forms=S-1&from=0&size=40",
    type: "rss",
    topic: "financial-markets",
    isActive: true,
  },
  {
    id: "sec-edgar-10k",
    name: "SEC EDGAR 10-K",
    url: "https://efts.sec.gov/LATEST/search-index?q=%2210-K%22&forms=10-K&from=0&size=40",
    type: "rss",
    topic: "financial-markets",
    isActive: true,
  },

  // ─── Federal Reserve (Primary Documents) ─────────────
  {
    id: "fed-press-monetary",
    name: "Federal Reserve Monetary Policy",
    url: "https://www.federalreserve.gov/feeds/press_monetary.xml",
    type: "rss",
    topic: "financial-markets",
    isActive: true,
  },
  {
    id: "fed-press-all",
    name: "Federal Reserve Press Releases",
    url: "https://www.federalreserve.gov/feeds/press_all.xml",
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
  {
    id: "nbc-news",
    name: "NBC News",
    url: "https://feeds.nbcnews.com/nbcnews/public/news",
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
  {
    id: "caranddriver",
    name: "Car and Driver",
    url: "https://www.caranddriver.com/rss/all.xml/",
    type: "rss",
    topic: "automotive",
    isActive: true,
  },
  {
    id: "jalopnik",
    name: "Jalopnik",
    url: "https://jalopnik.com/rss",
    type: "rss",
    topic: "automotive",
    isActive: true,
  },
  {
    id: "roadandtrack",
    name: "Road & Track",
    url: "https://www.roadandtrack.com/rss/all.xml/",
    type: "rss",
    topic: "automotive",
    isActive: true,
  },
  {
    id: "thedrive",
    name: "The Drive",
    url: "https://www.thedrive.com/feed",
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
