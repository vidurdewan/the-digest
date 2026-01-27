import { supabase, isSupabaseConfigured } from "./supabase";
import {
  isClaudeConfigured,
  generateBriefSummary,
  generateFullSummary,
  generateBatchBriefSummaries,
  type BatchArticle,
} from "./claude";
import { recordUsage, checkBudget } from "./cost-tracker";
import type { Summary, Entity, DecipheringSummary } from "@/types";

// ─── Cache: Check for existing summary ───────────────────────
/**
 * Check if a summary already exists for an article.
 * Prevents duplicate API calls.
 */
export async function getCachedSummary(
  articleId: string
): Promise<Summary | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  try {
    const { data } = await supabase
      .from("summaries")
      .select("*")
      .eq("article_id", articleId)
      .single();

    if (data) {
      return {
        id: data.id,
        articleId: data.article_id,
        brief: data.brief || "",
        theNews: data.the_news || "",
        whyItMatters: data.why_it_matters || "",
        theContext: data.the_context || "",
        keyEntities: (data.key_entities as Entity[]) || [],
        generatedAt: data.generated_at,
      };
    }
  } catch {
    // No cached summary found
  }
  return null;
}

/**
 * Get all cached summaries for a list of article IDs.
 * Used to batch-check cache before making API calls.
 */
export async function getCachedSummaries(
  articleIds: string[]
): Promise<Map<string, Summary>> {
  const cache = new Map<string, Summary>();
  if (!isSupabaseConfigured() || !supabase || articleIds.length === 0)
    return cache;

  try {
    const { data } = await supabase
      .from("summaries")
      .select("*")
      .in("article_id", articleIds);

    if (data) {
      for (const row of data) {
        cache.set(row.article_id, {
          id: row.id,
          articleId: row.article_id,
          brief: row.brief || "",
          theNews: row.the_news || "",
          whyItMatters: row.why_it_matters || "",
          theContext: row.the_context || "",
          keyEntities: (row.key_entities as Entity[]) || [],
          generatedAt: row.generated_at,
        });
      }
    }
  } catch (error) {
    console.error("[Summarization] Cache lookup error:", error);
  }
  return cache;
}

// ─── Store Summary ───────────────────────────────────────────
async function storeSummary(
  articleId: string,
  summary: {
    brief?: string;
    theNews?: string;
    whyItMatters?: string;
    theContext?: string;
    keyEntities?: Entity[];
    deciphering?: DecipheringSummary;
    tokensUsed?: number;
  }
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  try {
    // Build the upsert payload, only including deciphering if provided
    const payload: Record<string, unknown> = {
      article_id: articleId,
      brief: summary.brief,
      the_news: summary.theNews,
      why_it_matters: summary.whyItMatters,
      the_context: summary.theContext,
      key_entities: summary.keyEntities || [],
      tokens_used: summary.tokensUsed || 0,
      model_used: "claude-sonnet-4-20250514",
      generated_at: new Date().toISOString(),
    };

    if (summary.deciphering) {
      payload.deciphering = summary.deciphering;
    }

    // Upsert to handle partial updates (brief first, then full)
    const { error } = await supabase.from("summaries").upsert(
      payload,
      { onConflict: "article_id" }
    );

    if (error) {
      console.error("[Summarization] Store error:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[Summarization] Store error:", error);
    return false;
  }
}

// ─── Tiered Summarization ────────────────────────────────────

/**
 * TIER 1: Generate brief summaries for a batch of articles.
 * Called during ingestion — cheap, fast, gives users a teaser.
 */
export async function summarizeBatchBrief(
  articles: { id: string; title: string; content: string }[]
): Promise<{
  summarized: number;
  skipped: number;
  errors: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}> {
  const stats = {
    summarized: 0,
    skipped: 0,
    errors: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
  };

  if (!isClaudeConfigured()) {
    console.log("[Summarization] Claude not configured, skipping batch brief");
    return stats;
  }

  // Check budget
  const { allowed, usage } = await checkBudget();
  if (!allowed) {
    console.log(
      `[Summarization] Over daily budget ($${(usage.costCents / 100).toFixed(2)} / $${(usage.budgetCents / 100).toFixed(2)}). Skipping.`
    );
    stats.skipped = articles.length;
    return stats;
  }

  // Check which articles already have summaries
  const existingCache = await getCachedSummaries(
    articles.map((a) => a.id)
  );

  // Filter out articles that already have brief summaries
  const needsSummary = articles.filter((a) => {
    const cached = existingCache.get(a.id);
    return !cached || !cached.brief;
  });

  if (needsSummary.length === 0) {
    stats.skipped = articles.length;
    return stats;
  }

  // Process in batches of 10
  const batchSize = 10;
  for (let i = 0; i < needsSummary.length; i += batchSize) {
    // Re-check budget before each batch
    const budgetCheck = await checkBudget();
    if (!budgetCheck.allowed) {
      stats.skipped += needsSummary.length - i;
      break;
    }

    const batch: BatchArticle[] = needsSummary
      .slice(i, i + batchSize)
      .map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content || a.title,
      }));

    const result = await generateBatchBriefSummaries(batch);

    if (result) {
      stats.totalInputTokens += result.inputTokens;
      stats.totalOutputTokens += result.outputTokens;

      // Record usage
      await recordUsage(result.inputTokens, result.outputTokens);

      // Store each brief summary
      for (const r of result.results) {
        const stored = await storeSummary(r.articleId, { brief: r.brief });
        if (stored) {
          stats.summarized++;
        } else {
          stats.errors++;
        }
      }
    } else {
      stats.errors += batch.length;
    }
  }

  stats.skipped = articles.length - needsSummary.length;
  return stats;
}

/**
 * TIER 2: Generate a full summary for a single article.
 * Called when the user clicks to expand — more expensive, richer content.
 */
export async function summarizeFull(
  articleId: string,
  title: string,
  content: string,
  source: string
): Promise<Summary | null> {
  // Check cache first
  const cached = await getCachedSummary(articleId);
  if (cached && cached.theNews) {
    // Already have a full summary
    return cached;
  }

  if (!isClaudeConfigured()) {
    return null;
  }

  // Check budget
  const { allowed } = await checkBudget();
  if (!allowed) {
    console.log("[Summarization] Over budget, cannot generate full summary");
    return null;
  }

  // Generate full summary
  const result = await generateFullSummary(
    title,
    content || title,
    source
  );

  if (!result) return null;

  // Record usage
  await recordUsage(result.inputTokens, result.outputTokens);

  // Build summary object
  const summary: Summary = {
    id: cached?.id || "",
    articleId,
    brief: cached?.brief || "",
    theNews: result.theNews,
    whyItMatters: result.whyItMatters,
    theContext: result.theContext,
    keyEntities: result.keyEntities,
    generatedAt: new Date().toISOString(),
  };

  // If we don't have a brief, generate one from theNews
  if (!summary.brief) {
    summary.brief = result.theNews.slice(0, 200);
  }

  // Store in cache
  await storeSummary(articleId, {
    brief: summary.brief,
    theNews: result.theNews,
    whyItMatters: result.whyItMatters,
    theContext: result.theContext,
    keyEntities: result.keyEntities,
    tokensUsed: result.inputTokens + result.outputTokens,
  });

  return summary;
}

/**
 * Generate a brief summary for a single article (fallback for non-batch use).
 */
export async function summarizeBrief(
  articleId: string,
  title: string,
  content: string
): Promise<string | null> {
  // Check cache
  const cached = await getCachedSummary(articleId);
  if (cached?.brief) return cached.brief;

  if (!isClaudeConfigured()) return null;

  const { allowed } = await checkBudget();
  if (!allowed) return null;

  const result = await generateBriefSummary(title, content || title);
  if (!result) return null;

  await recordUsage(result.inputTokens, result.outputTokens);
  await storeSummary(articleId, { brief: result.brief });

  return result.brief;
}
