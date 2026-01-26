import { getActiveSources } from "./sources";
import { fetchAllRssFeeds, type RawArticle } from "./rss-fetcher";
import { fetchNewsApi } from "./news-api";
import { scrapeArticle } from "./article-scraper";
import { estimateReadingTime } from "./article-utils";
import { supabase, isSupabaseConfigured } from "./supabase";

export interface IngestionResult {
  totalFetched: number;
  totalStored: number;
  totalDuplicates: number;
  totalErrors: number;
  bySource: Record<string, number>;
  articles: RawArticle[];
}

/**
 * Main ingestion function: fetches articles from all active sources,
 * deduplicates, optionally scrapes full content, and stores in Supabase.
 */
export async function ingestAllNews(options?: {
  scrapeContent?: boolean;
  maxPerSource?: number;
}): Promise<IngestionResult> {
  const { scrapeContent = false } = options || {};

  const result: IngestionResult = {
    totalFetched: 0,
    totalStored: 0,
    totalDuplicates: 0,
    totalErrors: 0,
    bySource: {},
    articles: [],
  };

  // Fetch from RSS feeds
  const rssSources = getActiveSources("rss");
  const rssArticles = await fetchAllRssFeeds(rssSources);
  result.totalFetched += rssArticles.length;

  // Fetch from NewsAPI
  const apiSources = getActiveSources("api");
  const apiArticles: RawArticle[] = [];
  for (const source of apiSources) {
    const articles = await fetchNewsApi(source);
    apiArticles.push(...articles);
  }
  result.totalFetched += apiArticles.length;

  // Combine all articles
  const allArticles = [...rssArticles, ...apiArticles];

  // Deduplicate by content hash
  const seen = new Set<string>();
  const uniqueArticles: RawArticle[] = [];
  for (const article of allArticles) {
    if (!seen.has(article.contentHash)) {
      seen.add(article.contentHash);
      uniqueArticles.push(article);
    } else {
      result.totalDuplicates++;
    }
  }

  // Optionally scrape full content for articles that have incomplete content
  if (scrapeContent) {
    const articlesToScrape = uniqueArticles.filter(
      (a) => !a.content || a.content.length < 200
    );

    // Scrape in batches of 3 to be respectful
    const scrapeBatch = 3;
    for (let i = 0; i < Math.min(articlesToScrape.length, 15); i += scrapeBatch) {
      const batch = articlesToScrape.slice(i, i + scrapeBatch);
      const results = await Promise.allSettled(
        batch.map((a) => scrapeArticle(a.url))
      );

      results.forEach((r, idx) => {
        if (r.status === "fulfilled" && r.value) {
          batch[idx].content = r.value.content;
          if (!batch[idx].imageUrl && r.value.imageUrl) {
            batch[idx].imageUrl = r.value.imageUrl;
          }
        }
      });
    }
  }

  // Count by source
  for (const article of uniqueArticles) {
    result.bySource[article.sourceName] =
      (result.bySource[article.sourceName] || 0) + 1;
  }

  // Store in Supabase — batch upsert for performance (avoids Vercel function timeout)
  if (isSupabaseConfigured() && supabase) {
    const rows = uniqueArticles.map((article) => ({
      title: article.title,
      url: article.url,
      author: article.author,
      content: article.content,
      image_url: article.imageUrl,
      published_at: article.publishedAt,
      topic: article.topic,
      reading_time_minutes: estimateReadingTime(article.content || ""),
      content_hash: article.contentHash,
    }));

    // Batch in groups of 50 to stay within Supabase payload limits
    const BATCH_SIZE = 50;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      try {
        const { error, count } = await supabase
          .from("articles")
          .upsert(batch, { onConflict: "content_hash", count: "exact" });

        if (!error) {
          result.totalStored += count ?? batch.length;
        } else {
          result.totalErrors += batch.length;
          console.error(`Batch upsert error:`, error.message);
        }
      } catch {
        result.totalErrors += batch.length;
      }
    }
  }

  result.articles = uniqueArticles;
  return result;
}

/**
 * Fetch articles from Supabase, optionally filtered by topic.
 * Tries to join summaries + article_intelligence; falls back gracefully
 * if the intelligence table or FK relationship doesn't exist yet.
 */
export async function getStoredArticles(options?: {
  topic?: string;
  limit?: number;
  offset?: number;
}): Promise<{ articles: Record<string, unknown>[]; count: number }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { articles: [], count: 0 };
  }

  const { topic, limit = 50, offset = 0 } = options || {};

  // Try full query with intelligence join first
  let query = supabase
    .from("articles")
    .select(
      "*, summaries(id, brief, the_news, why_it_matters, the_context, key_entities, generated_at), article_intelligence(significance_score, story_type, connects_to, story_thread_id, watch_for_next, is_surprise_candidate)",
      { count: "exact" }
    )
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (topic) {
    query = query.eq("topic", topic);
  }

  const { data, error, count } = await query;

  if (!error) {
    return { articles: (data as Record<string, unknown>[]) || [], count: count || 0 };
  }

  // If the error is about a missing relationship, retry without intelligence join
  if (error.message.includes("relationship")) {
    console.warn("Falling back to query without article_intelligence join");

    let fallbackQuery = supabase
      .from("articles")
      .select(
        "*, summaries(id, brief, the_news, why_it_matters, the_context, key_entities, generated_at)",
        { count: "exact" }
      )
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (topic) {
      fallbackQuery = fallbackQuery.eq("topic", topic);
    }

    const { data: fbData, error: fbError, count: fbCount } = await fallbackQuery;

    if (!fbError) {
      return { articles: (fbData as Record<string, unknown>[]) || [], count: fbCount || 0 };
    }

    console.error("Fallback query also failed:", fbError.message);
    return { articles: [], count: 0 };
  }

  console.error("Failed to fetch articles:", error.message);
  return { articles: [], count: 0 };
}
