import { supabase, isSupabaseConfigured } from "./supabase";
import { isClaudeConfigured } from "./claude";
import { recordUsage, checkBudget } from "./cost-tracker";
import Anthropic from "@anthropic-ai/sdk";
import type { ArticleIntelligence, ArticleConnection, StoryType, SignificanceLevel } from "@/types";

// Claude API client — lazy-initialized (same pattern as claude.ts)
let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client = new Anthropic({ apiKey });
  return client;
}

const SUMMARIZATION_MODEL = "claude-sonnet-4-20250514";

// ─── Types ───────────────────────────────────────────────────

interface IntelligenceInput {
  id: string;
  title: string;
  content: string;
  source: string;
  topic: string;
  entityNames?: string[];
}

interface IntelligenceResult {
  articleId: string;
  significanceScore: SignificanceLevel;
  storyType: StoryType;
  connectsTo: ArticleConnection[];
  watchForNext: string;
  isSurpriseCandidate: boolean;
}

// ─── Generate Intelligence for a Batch ───────────────────────

/**
 * Classify a batch of articles with intelligence metadata.
 * Processes up to 15 articles per API call.
 * Budget-checked before each batch.
 */
export async function generateBatchIntelligence(
  articles: IntelligenceInput[]
): Promise<{
  results: IntelligenceResult[];
  totalInputTokens: number;
  totalOutputTokens: number;
} | null> {
  const anthropic = getClient();
  if (!anthropic || articles.length === 0) return null;

  const batch = articles.slice(0, 15);

  const articlesText = batch
    .map(
      (a, i) =>
        `[${i + 1}] ID: ${a.id}\nTitle: ${a.title}\nSource: ${a.source}\nTopic: ${a.topic}\nEntities: ${(a.entityNames || []).join(", ") || "none"}\nContent: ${a.content.slice(0, 600)}`
    )
    .join("\n\n---\n\n");

  try {
    const response = await anthropic.messages.create({
      model: SUMMARIZATION_MODEL,
      max_tokens: 300 * batch.length,
      messages: [
        {
          role: "user",
          content: `You are an intelligence analyst. For each article below, classify:

1. **story_type**: One of: breaking, developing, analysis, opinion, feature, update
2. **significance_score**: 1-10 (10 = most important for a well-informed professional)
3. **connections**: Which OTHER articles in this batch does it relate to? List by ID with a brief reason and strength (strong/moderate/weak). Only include genuine connections — shared entities, topics, or narrative threads.
4. **watch_for_next**: One sentence predicting what development the reader should watch for next. Be specific.
5. **is_surprise_candidate**: true if this story is outside typical VC/tech/markets coverage but still notable and interesting.

Here are ${batch.length} articles:

${articlesText}

Respond in EXACTLY this JSON format (no markdown, no code fences):
[
  {
    "id": "article-id",
    "story_type": "breaking",
    "significance_score": 7,
    "connections": [{"id": "other-article-id", "title": "Other Article Title", "reason": "Both cover AI regulation", "strength": "moderate"}],
    "watch_for_next": "Watch for the SEC's response to this filing next week.",
    "is_surprise_candidate": false
  }
]`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    const parsed = JSON.parse(text.trim());
    const results: IntelligenceResult[] = Array.isArray(parsed)
      ? parsed.map((r: {
          id: string;
          story_type: string;
          significance_score: number;
          connections: Array<{ id: string; title?: string; reason: string; strength: string }>;
          watch_for_next: string;
          is_surprise_candidate: boolean;
        }) => ({
          articleId: r.id,
          significanceScore: Math.min(10, Math.max(1, Math.round(r.significance_score || 5))) as SignificanceLevel,
          storyType: validateStoryType(r.story_type),
          connectsTo: (r.connections || []).map((c) => ({
            articleId: c.id,
            articleTitle: c.title || "",
            reason: c.reason || "",
            strength: validateStrength(c.strength),
          })),
          watchForNext: r.watch_for_next || "",
          isSurpriseCandidate: r.is_surprise_candidate || false,
        }))
      : [];

    return {
      results,
      totalInputTokens: response.usage.input_tokens,
      totalOutputTokens: response.usage.output_tokens,
    };
  } catch (error) {
    console.error("[Intelligence] Batch classification error:", error);
    return null;
  }
}

// ─── Store Intelligence ──────────────────────────────────────

/**
 * Store pre-computed intelligence data for articles.
 * Upserts to handle re-processing.
 */
export async function storeBatchIntelligence(
  results: IntelligenceResult[]
): Promise<{ stored: number; errors: number }> {
  const stats = { stored: 0, errors: 0 };

  if (!isSupabaseConfigured() || !supabase || results.length === 0) {
    return stats;
  }

  for (const result of results) {
    try {
      const { error } = await supabase.from("article_intelligence").upsert(
        {
          article_id: result.articleId,
          significance_score: result.significanceScore,
          story_type: result.storyType,
          connects_to: result.connectsTo,
          watch_for_next: result.watchForNext,
          is_surprise_candidate: result.isSurpriseCandidate,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "article_id" }
      );

      if (error) {
        console.error("[Intelligence] Store error:", error.message);
        stats.errors++;
      } else {
        stats.stored++;
      }
    } catch {
      stats.errors++;
    }
  }

  return stats;
}

// ─── Full Pipeline: Classify + Store ─────────────────────────

/**
 * Full intelligence pipeline: check budget, classify batch, store results.
 * Called during article ingestion for top articles.
 */
export async function processIntelligenceBatch(
  articles: IntelligenceInput[]
): Promise<{
  processed: number;
  skipped: number;
  errors: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}> {
  const stats = {
    processed: 0,
    skipped: 0,
    errors: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
  };

  if (!isClaudeConfigured()) {
    console.log("[Intelligence] Claude not configured, skipping");
    stats.skipped = articles.length;
    return stats;
  }

  // Check budget
  const { allowed, usage } = await checkBudget();
  if (!allowed) {
    console.log(
      `[Intelligence] Over daily budget ($${(usage.costCents / 100).toFixed(2)} / $${(usage.budgetCents / 100).toFixed(2)}). Skipping.`
    );
    stats.skipped = articles.length;
    return stats;
  }

  // Check which articles already have intelligence data
  if (isSupabaseConfigured() && supabase) {
    const articleIds = articles.map((a) => a.id);
    const { data: existing } = await supabase
      .from("article_intelligence")
      .select("article_id")
      .in("article_id", articleIds);

    const existingIds = new Set((existing || []).map((e: { article_id: string }) => e.article_id));
    const needsProcessing = articles.filter((a) => !existingIds.has(a.id));

    if (needsProcessing.length === 0) {
      stats.skipped = articles.length;
      return stats;
    }

    // Process in batches of 15
    const batchSize = 15;
    for (let i = 0; i < needsProcessing.length; i += batchSize) {
      // Re-check budget before each batch
      const budgetCheck = await checkBudget();
      if (!budgetCheck.allowed) {
        stats.skipped += needsProcessing.length - i;
        break;
      }

      const batch = needsProcessing.slice(i, i + batchSize);
      const result = await generateBatchIntelligence(batch);

      if (result) {
        stats.totalInputTokens += result.totalInputTokens;
        stats.totalOutputTokens += result.totalOutputTokens;

        await recordUsage(result.totalInputTokens, result.totalOutputTokens);

        const storeResult = await storeBatchIntelligence(result.results);
        stats.processed += storeResult.stored;
        stats.errors += storeResult.errors;
      } else {
        stats.errors += batch.length;
      }
    }

    stats.skipped = articles.length - needsProcessing.length;
  } else {
    stats.skipped = articles.length;
  }

  return stats;
}

// ─── Get Intelligence for Articles ───────────────────────────

/**
 * Fetch pre-computed intelligence for a list of article IDs.
 */
export async function getArticleIntelligence(
  articleIds: string[]
): Promise<Map<string, ArticleIntelligence>> {
  const result = new Map<string, ArticleIntelligence>();

  if (!isSupabaseConfigured() || !supabase || articleIds.length === 0) {
    return result;
  }

  try {
    const { data } = await supabase
      .from("article_intelligence")
      .select("*")
      .in("article_id", articleIds);

    if (data) {
      for (const row of data) {
        result.set(row.article_id, {
          significanceScore: row.significance_score as SignificanceLevel,
          storyType: row.story_type as StoryType,
          connectsTo: (row.connects_to as ArticleConnection[]) || [],
          storyThreadId: row.story_thread_id || undefined,
          watchForNext: row.watch_for_next || undefined,
          isSurpriseCandidate: row.is_surprise_candidate || false,
        });
      }
    }
  } catch (error) {
    console.error("[Intelligence] Fetch error:", error);
  }

  return result;
}

// ─── Weekly Synthesis ────────────────────────────────────────

interface WeeklySynthesisInput {
  id: string;
  title: string;
  topic: string;
  source: string;
  brief: string;
  storyType?: string;
  significanceScore?: number;
}

/**
 * Generate a weekly synthesis summarizing the week's top threads,
 * emerging patterns, and narrative arc.
 */
export async function generateWeeklySynthesis(
  articles: WeeklySynthesisInput[],
  weekStart: string,
  weekEnd: string
): Promise<{
  synthesis: string;
  threads: Array<{ title: string; summary: string; articleCount: number }>;
  patterns: string[];
  totalInputTokens: number;
  totalOutputTokens: number;
} | null> {
  const anthropic = getClient();
  if (!anthropic || articles.length === 0) return null;

  // Budget check
  const { allowed } = await checkBudget();
  if (!allowed) {
    console.log("[Intelligence] Over budget, skipping weekly synthesis");
    return null;
  }

  const articlesText = articles
    .slice(0, 50) // Cap at 50 articles for context window
    .map(
      (a, i) =>
        `[${i + 1}] ${a.title} (${a.source}, ${a.topic}${a.storyType ? `, ${a.storyType}` : ""}${a.significanceScore ? `, significance: ${a.significanceScore}/10` : ""})\nBrief: ${a.brief}`
    )
    .join("\n\n");

  try {
    const response = await anthropic.messages.create({
      model: SUMMARIZATION_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are an intelligence analyst writing a weekly synthesis for the week of ${weekStart} to ${weekEnd}.

Here are the week's articles:

${articlesText}

Produce a weekly intelligence synthesis in this JSON format (no markdown fences):
{
  "synthesis": "A 3-4 paragraph narrative summary of the week's most important developments, how they connect, and what they mean for a well-informed professional.",
  "threads": [
    {
      "title": "Thread Title",
      "summary": "What happened in this thread this week and why it matters.",
      "articleCount": 3
    }
  ],
  "patterns": [
    "Pattern 1: A brief description of an emerging pattern or trend you noticed across multiple articles.",
    "Pattern 2: Another trend or signal."
  ]
}

Guidelines:
- The synthesis should read like a concise intelligence briefing
- Identify 3-7 major threads (groupings of related stories)
- Identify 2-5 patterns or emerging signals
- Be specific and actionable, not generic`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    await recordUsage(response.usage.input_tokens, response.usage.output_tokens);

    const parsed = JSON.parse(text.trim());

    return {
      synthesis: parsed.synthesis || "",
      threads: (parsed.threads || []).map(
        (t: { title: string; summary: string; articleCount: number }) => ({
          title: t.title,
          summary: t.summary,
          articleCount: t.articleCount || 0,
        })
      ),
      patterns: parsed.patterns || [],
      totalInputTokens: response.usage.input_tokens,
      totalOutputTokens: response.usage.output_tokens,
    };
  } catch (error) {
    console.error("[Intelligence] Weekly synthesis error:", error);
    return null;
  }
}

/**
 * Store a weekly synthesis in the database.
 */
export async function storeWeeklySynthesis(
  weekStart: string,
  weekEnd: string,
  synthesis: string,
  threads: Array<{ title: string; summary: string; articleCount: number }>,
  patterns: string[]
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  try {
    const { error } = await supabase.from("weekly_synthesis").upsert(
      {
        week_start: weekStart,
        week_end: weekEnd,
        synthesis,
        threads,
        patterns,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "week_start" }
    );

    if (error) {
      console.error("[Intelligence] Store weekly synthesis error:", error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function validateStoryType(type: string): StoryType {
  const valid: StoryType[] = ['breaking', 'developing', 'analysis', 'opinion', 'feature', 'update'];
  return valid.includes(type as StoryType) ? (type as StoryType) : 'update';
}

function validateStrength(strength: string): 'strong' | 'moderate' | 'weak' {
  const valid = ['strong', 'moderate', 'weak'];
  return valid.includes(strength) ? (strength as 'strong' | 'moderate' | 'weak') : 'moderate';
}
