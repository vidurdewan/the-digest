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

  // Store in Supabase
  if (!isSupabaseConfigured() || !supabase) {
    const msg = "Supabase admin client is NOT configured — articles will not be stored. " +
      "Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in environment variables.";
    console.error(`[Ingest] ${msg}`);
    result.errorMessages.push(msg);
  }
  if (isSupabaseConfigured() && supabase) {
    const rows = buildInsertRows(uniqueArticles);

    // Step 1: Check which content_hashes already exist in the DB.
    // This avoids relying on upsert/onConflict which requires a unique constraint.
    const existingHashes = new Set<string>();
    const allHashes = rows.map((r) => r.content_hash);
    const HASH_CHUNK = 500;
    for (let i = 0; i < allHashes.length; i += HASH_CHUNK) {
      const chunk = allHashes.slice(i, i + HASH_CHUNK);
      try {
        const { data: existingRows } = await supabase
          .from("articles")
          .select("content_hash")
          .in("content_hash", chunk);
        if (existingRows) {
          for (const r of existingRows) {
            existingHashes.add(r.content_hash as string);
          }
        }
      } catch (err) {
        // If we can't check for existing hashes, proceed with all rows
        // (inserts may fail for duplicates, but at least new articles get through)
        console.warn("[Ingest] Could not check existing hashes:", err);
      }
    }

    // Step 2: Filter to only new articles
    const newRows = rows.filter((r) => !existingHashes.has(r.content_hash));
    result.totalDuplicates += rows.length - newRows.length;

    if (newRows.length === 0) {
      console.log("[Ingest] All articles already exist in database — nothing to insert.");
    }

    // Step 3: Insert new articles in sequential batches
    const BATCH_SIZE = 50;
    const missingColumns = new Set<string>();

    for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
      let currentBatch = newRows.slice(i, i + BATCH_SIZE);

      // Remove any columns already known to be missing from the DB schema
      if (missingColumns.size > 0) {
        currentBatch = removeColumns(currentBatch, [...missingColumns]);
      }

      let stored = false;
      let batchErrorCounted = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await supabase
          .from("articles")
          .insert(currentBatch)
          .select("content_hash");

        if (!error) {
          result.totalStored += data?.length ?? currentBatch.length;
          stored = true;
          break;
        }

        const missingColumn = extractMissingColumn(error);
        if (!missingColumn) {
          // Not a missing-column error — log and move to next batch
          const errMsg = error.message;
          console.error(`[Ingest] Batch insert error: ${errMsg}`);
          if (result.errorMessages.length < 3 && !result.errorMessages.includes(errMsg)) {
            result.errorMessages.push(errMsg);
          }
          result.totalErrors += currentBatch.length;
          batchErrorCounted = true;
          break;
        }

        missingColumns.add(missingColumn);
        currentBatch = removeColumns(
          newRows.slice(i, i + BATCH_SIZE),
          [...missingColumns]
        );
        console.warn(
          `[Ingest] Retrying insert without column "${missingColumn}". ` +
            "Run pending database migrations to restore full schema support."
        );
      }

      if (!stored && !batchErrorCounted) {
        result.totalErrors += currentBatch.length;
        if (result.errorMessages.length < 3) {
          result.errorMessages.push("Insert failed after retrying with fallback columns");
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

  // Fallback 1: retry without article_intelligence + article_signals joins
  console.warn(`[getStoredArticles] Full query failed: ${error.message}. Trying without intelligence/signals joins.`);

  let fb1Query = supabase
    .from("articles")
    .select(
      "*, summaries(id, brief, the_news, why_it_matters, the_context, key_entities, deciphering, generated_at)",
      { count: "exact" }
    )
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (topic) {
    fb1Query = fb1Query.eq("topic", topic);
  }

  const { data: fb1Data, error: fb1Error, count: fb1Count } = await fb1Query;

  if (!fb1Error) {
    return { articles: (fb1Data as Record<string, unknown>[]) || [], count: fb1Count || 0 };
  }

  // Fallback 2: retry with just the articles table, no joins at all
  console.warn(`[getStoredArticles] Summaries join also failed: ${fb1Error.message}. Trying articles-only query.`);

  let fb2Query = supabase
    .from("articles")
    .select("*", { count: "exact" })
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (topic) {
    fb2Query = fb2Query.eq("topic", topic);
  }

  const { data: fb2Data, error: fb2Error, count: fb2Count } = await fb2Query;

  if (!fb2Error) {
    return { articles: (fb2Data as Record<string, unknown>[]) || [], count: fb2Count || 0 };
  }

  console.error("[getStoredArticles] All queries failed:", fb2Error.message);
  return { articles: [], count: 0 };
}
