import { getActiveSources } from "./sources";
import { fetchAllRssFeeds, type RawArticle } from "./rss-fetcher";
import { fetchNewsApi } from "./news-api";
import { scrapeArticle } from "./article-scraper";
import { estimateReadingTime } from "./article-utils";
import { supabaseAdmin as supabase, isSupabaseAdminConfigured as isSupabaseConfigured } from "./supabase";
import { filterSECFilings } from "./sec-filter";

// ─── Promo / Coupon Filter ────────────────────────────────────
// Title-level keyword patterns that indicate promotional/deal content
const PROMO_TITLE_PATTERNS = [
  /\bpromo(?:tion(?:al)?)?\s*code/i,
  /\bcoupon\s*code/i,
  /\bdiscount\s*code/i,
  /\breferral\s*code/i,
  /\bvoucher\s*code/i,
  /\b\d+%\s*off\b/i,
  /\bdeal\s*(?:alert|of the day|round-?up)/i,
  /\bbest\s+(?:deals|coupons|promo)/i,
  /\bsave\s+\$?\d+/i,
  /\bflash\s+sale\b/i,
  /\bclearance\s+sale\b/i,
  /\bbuy\s+one\s+get\s+one\b/i,
  /\bBOGO\b/,
  /\bfree\s+shipping\s+code/i,
  /\bexclusive\s+(?:offer|discount|savings)\b/i,
  /\blimited[\s-]+time\s+(?:offer|deal|discount)\b/i,
  /\buse\s+code\b/i,
  /\bapply\s+code\b/i,
];

/**
 * Returns true if an article title matches known promo/coupon patterns.
 */
export function isPromoArticle(title: string): boolean {
  return PROMO_TITLE_PATTERNS.some((pattern) => pattern.test(title));
}

export interface IngestionResult {
  totalFetched: number;
  totalStored: number;
  totalDuplicates: number;
  totalErrors: number;
  errorMessages: string[];
  bySource: Record<string, number>;
  articles: RawArticle[];
}

interface ArticleInsertRow {
  title: string;
  url: string;
  author: string | null;
  content: string | null;
  image_url: string | null;
  published_at: string | null;
  topic: string;
  reading_time_minutes: number;
  content_hash: string;
  source_tier?: number;
  document_type?: string | null;
}

function normalizePublishedAt(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function buildInsertRows(articles: RawArticle[]): ArticleInsertRow[] {
  return articles.map((article) => ({
    title: article.title,
    url: article.url,
    author: article.author,
    content: article.content,
    image_url: article.imageUrl,
    published_at: normalizePublishedAt(article.publishedAt),
    topic: article.topic,
    reading_time_minutes: estimateReadingTime(article.content || ""),
    content_hash: article.contentHash,
    source_tier: article.sourceTier,
    document_type: article.documentType || null,
  }));
}

function removeColumns(rows: ArticleInsertRow[], columns: string[]): ArticleInsertRow[] {
  if (columns.length === 0) return rows;
  return rows.map((row) => {
    const nextRow = { ...row };
    for (const col of columns) {
      delete nextRow[col as keyof ArticleInsertRow];
    }
    return nextRow;
  });
}

function extractMissingColumn(error: unknown): string | null {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: string }).message)
      : "";
  const match = message.match(/column\s+"([a-z_]+)"\s+of relation\s+"articles"\s+does not exist/i);
  return match?.[1] || null;
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
    errorMessages: [],
    bySource: {},
    articles: [],
  };

  // Fetch from RSS feeds and NewsAPI in parallel
  const rssSources = getActiveSources("rss");
  const apiSources = getActiveSources("api");

  const [rssArticles, ...apiResults] = await Promise.all([
    fetchAllRssFeeds(rssSources),
    ...apiSources.map((source) => fetchNewsApi(source)),
  ]);

  const apiArticles = apiResults.flat();
  result.totalFetched += rssArticles.length + apiArticles.length;

  // Filter SEC filings to only relevant companies
  const filteredRssArticles = await filterSECFilings(rssArticles);

  // Filter out promo/coupon articles by title keywords
  const nonPromoRss = filteredRssArticles.filter((a) => !isPromoArticle(a.title));
  const nonPromoApi = apiArticles.filter((a) => !isPromoArticle(a.title));
  const promoFiltered = (filteredRssArticles.length - nonPromoRss.length) + (apiArticles.length - nonPromoApi.length);
  if (promoFiltered > 0) {
    console.log(`[Promo Filter] Dropped ${promoFiltered} promo/coupon articles`);
  }

  // Combine all articles
  const allArticles = [...nonPromoRss, ...nonPromoApi];

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

    // Scrape in batches of 5, up to 30 articles
    const scrapeBatch = 5;
    const scrapeLimit = Math.min(articlesToScrape.length, 30);
    for (let i = 0; i < scrapeLimit; i += scrapeBatch) {
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

  // Store in Supabase — parallel batch upserts
  if (!isSupabaseConfigured() || !supabase) {
    const msg = "Supabase admin client is NOT configured — articles will not be stored. " +
      "Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in environment variables.";
    console.error(`[Ingest] ${msg}`);
    result.errorMessages.push(msg);
  }
  if (isSupabaseConfigured() && supabase) {
    const rows = buildInsertRows(uniqueArticles);

    // Batch in groups of 50, run all batches in parallel
    const BATCH_SIZE = 50;
    const batches: (typeof rows)[] = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      batches.push(rows.slice(i, i + BATCH_SIZE));
    }

    const missingColumns = new Set<string>();

    const batchResults = await Promise.allSettled(
      batches.map(async (batch) => {
        let currentBatch = batch;

        // Retry upserts when an environment has not yet applied newer schema columns.
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data, error } = await supabase!
            .from("articles")
            .upsert(currentBatch, { onConflict: "content_hash" })
            .select("content_hash");

          if (!error) {
            return data?.length ?? currentBatch.length;
          }

          const missingColumn = extractMissingColumn(error);
          if (!missingColumn) {
            // Not a missing-column error — try fallback plain insert
            console.warn(`[Ingest] Upsert failed: ${error.message}. Trying plain insert as fallback.`);
            const { data: insertData, error: insertError } = await supabase!
              .from("articles")
              .insert(currentBatch)
              .select("content_hash");

            if (!insertError) {
              return insertData?.length ?? currentBatch.length;
            }

            // Plain insert also failed — throw with details
            throw new Error(`Upsert: ${error.message} | Insert fallback: ${insertError.message}`);
          }

          missingColumns.add(missingColumn);
          currentBatch = removeColumns(batch, [...missingColumns]);
          console.warn(
            `[Ingest] Retrying upsert without missing column "${missingColumn}". ` +
              "Run pending database migrations to restore full schema support."
          );
        }

        throw new Error("Upsert failed after retrying with fallback columns");
      })
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        result.totalStored += r.value;
      } else {
        result.totalErrors += BATCH_SIZE;
        const errMsg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        console.error("Batch upsert error:", errMsg);
        // Capture unique error messages (avoid duplicating the same error for every batch)
        if (result.errorMessages.length < 3 && !result.errorMessages.includes(errMsg)) {
          result.errorMessages.push(errMsg);
        }
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
      "*, summaries(id, brief, the_news, why_it_matters, the_context, key_entities, deciphering, generated_at), article_intelligence(significance_score, story_type, connects_to, story_thread_id, watch_for_next, is_surprise_candidate), article_signals(id, signal_type, signal_label, entity_name, confidence, detected_at)",
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
        "*, summaries(id, brief, the_news, why_it_matters, the_context, key_entities, deciphering, generated_at)",
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
