import type { TopicCategory } from "@/types";
import type { NewsSource } from "./sources";
import { generateContentHash } from "./article-utils";
import type { RawArticle } from "./rss-fetcher";
import { isPromotionalContent } from "./rss-fetcher";
import { getArticleSourceTier } from "./source-tiers";

const NEWS_API_BASE = "https://newsapi.org/v2";

interface NewsApiArticle {
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  author: string | null;
  source: { id: string | null; name: string };
  content: string | null;
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

/**
 * Fetch articles from NewsAPI for a given source.
 * The source.url field contains the search query for API-type sources.
 */
export async function fetchNewsApi(source: NewsSource): Promise<RawArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    console.warn("NEWS_API_KEY not configured, skipping NewsAPI fetch");
    return [];
  }

  try {
    // source.url is already formatted as a URL-safe query string (e.g. "term+OR+%22phrase%22")
    // so we must NOT re-encode it — that would double-encode %22 → %2522 and + → %2B
    const url = `${NEWS_API_BASE}/everything?q=${source.url}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}`;

    const response = await fetch(url, {
      headers: { "User-Agent": "TheDigest/1.0" },
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("NewsAPI rate limit reached");
        return [];
      }
      throw new Error(`NewsAPI returned ${response.status}`);
    }

    const data: NewsApiResponse = await response.json();

    if (data.status !== "ok") {
      throw new Error(`NewsAPI error: ${data.status}`);
    }

    return data.articles
      .filter((a) => a.title && a.url && a.title !== "[Removed]")
      .filter((a) => !isPromotionalContent(a.title, a.url))
      .map((a) => {
        const sourceName = a.source.name || source.name;
        return {
          title: a.title,
          url: a.url,
          author: a.author,
          publishedAt: a.publishedAt
            ? new Date(a.publishedAt).toISOString()
            : new Date().toISOString(),
          topic: source.topic,
          sourceName,
          sourceId: source.id,
          content: a.content || a.description || null,
          imageUrl: a.urlToImage,
          contentHash: generateContentHash(a.title, a.url),
          sourceTier: getArticleSourceTier(sourceName, a.url),
          requiresClassification: source.requiresClassification,
        };
      });
  } catch (error) {
    console.error(`Failed to fetch NewsAPI for ${source.name}:`, error);
    return [];
  }
}

/**
 * Fetch top headlines from NewsAPI for a specific category.
 */
export async function fetchTopHeadlines(
  category: string,
  topic: TopicCategory,
  country: string = "us"
): Promise<RawArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `${NEWS_API_BASE}/top-headlines?category=${category}&country=${country}&pageSize=10&apiKey=${apiKey}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "TheDigest/1.0" },
    });

    if (!response.ok) return [];

    const data: NewsApiResponse = await response.json();
    if (data.status !== "ok") return [];

    return data.articles
      .filter((a) => a.title && a.url && a.title !== "[Removed]")
      .filter((a) => !isPromotionalContent(a.title, a.url))
      .map((a) => {
        const sourceName = a.source.name || "NewsAPI";
        return {
          title: a.title,
          url: a.url,
          author: a.author,
          publishedAt: a.publishedAt
            ? new Date(a.publishedAt).toISOString()
            : new Date().toISOString(),
          topic,
          sourceName,
          sourceId: `newsapi-${category}`,
          content: a.content || a.description || null,
          imageUrl: a.urlToImage,
          contentHash: generateContentHash(a.title, a.url),
          sourceTier: getArticleSourceTier(sourceName, a.url),
        };
      });
  } catch (error) {
    console.error(`Failed to fetch top headlines (${category}):`, error);
    return [];
  }
}
