import { NextRequest, NextResponse } from "next/server";
import { ingestAllNews, getStoredArticles } from "@/lib/article-ingestion";
import { summarizeBatchBrief } from "@/lib/summarization";
import { processIntelligenceBatch } from "@/lib/intelligence";
import { isClaudeConfigured, classifyArticleTopics } from "@/lib/claude";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const maxDuration = 300;
import { rankRecentArticles } from "@/lib/story-ranker";

/**
 * Run post-ingestion background work (summarization, intelligence, ranking).
 * Fire-and-forget — errors are logged but don't block the response.
 */
async function runPostIngestionWork(
  articles: { contentHash: string; content?: string | null; title: string }[],
  shouldSummarize: boolean
) {
  try {
    // Summarization
    if (shouldSummarize && isClaudeConfigured() && articles.length > 0) {
      const candidateArticles = articles
        .filter((a) => a.content && a.content.length > 50)
        .slice(0, 50);

      if (candidateArticles.length > 0 && isSupabaseConfigured() && supabase) {
        const hashes = candidateArticles.map((a) => a.contentHash);
        const { data: storedForSummary } = await supabase
          .from("articles")
          .select("id, title, content, content_hash")
          .in("content_hash", hashes);

        if (storedForSummary && storedForSummary.length > 0) {
          const articlesToSummarize = storedForSummary
            .filter((s: { content: string | null }) => s.content && s.content.length > 50)
            .map((s: { id: string; title: string; content: string }) => ({
              id: s.id,
              title: s.title,
              content: s.content || s.title,
            }));

          if (articlesToSummarize.length > 0) {
            await summarizeBatchBrief(articlesToSummarize);
          }
        }
      }
    }

    // Topic classification, intelligence processing, and ranking in parallel
    const work: Promise<unknown>[] = [];

    // AI topic classification — reclassify recent articles based on content
    if (isClaudeConfigured() && isSupabaseConfigured() && supabase) {
      work.push(
        (async () => {
          try {
            const { data: recentArticles } = await supabase
              .from("articles")
              .select("id, title, content, topic")
              .order("published_at", { ascending: false })
              .limit(50);

            if (!recentArticles || recentArticles.length === 0) return;

            const toClassify = recentArticles
              .filter((a: { content: string | null }) => a.content && a.content.length > 50)
              .map((a: { id: string; title: string; content: string; topic: string }) => ({
                id: a.id,
                title: a.title,
                content: a.content,
                currentTopic: a.topic,
              }));

            // Classify in batches of 20
            for (let i = 0; i < toClassify.length; i += 20) {
              const batch = toClassify.slice(i, i + 20);
              const results = await classifyArticleTopics(batch);
              if (!results) continue;

              // Update articles whose topic changed
              const updates = results.filter(
                (r, idx) => r.topic !== batch[idx].currentTopic
              );

              if (updates.length > 0) {
                await Promise.allSettled(
                  updates.map((u) =>
                    supabase!
                      .from("articles")
                      .update({ topic: u.topic })
                      .eq("id", u.id)
                  )
                );
                console.log(`[Ingest] Reclassified ${updates.length} articles`);
              }
            }
          } catch (err) {
            console.error("[Ingest] Topic classification error:", err);
          }
        })()
      );
    }

    if (isClaudeConfigured() && articles.length > 0) {
      work.push(
        getStoredArticles({ limit: 20 }).then(async ({ articles: storedArticles }) => {
          const typedArticles = storedArticles as { id: string; title: string; content?: string | null; url?: string | null; topic?: string | null }[];
          const intelligenceArticles = typedArticles
            .filter((a) => a.content && a.content.length > 50)
            .slice(0, 20)
            .map((a) => ({
              id: a.id,
              title: a.title,
              content: a.content || a.title,
              source: a.url || "",
              topic: a.topic || "",
            }));

          if (intelligenceArticles.length > 0) {
            await processIntelligenceBatch(intelligenceArticles);
          }
        })
      );
    }

    work.push(rankRecentArticles().catch((err) => {
      console.error("[Ingest] Ranking error:", err);
    }));

    await Promise.allSettled(work);
  } catch (err) {
    console.error("[Ingest] Post-ingestion background error:", err);
  }
}

/**
 * GET /api/ingest/news
 * Fetches news from all active RSS feeds and NewsAPI sources.
 * Returns immediately after ingestion; summarization/intelligence/ranking
 * run in the background without blocking the response.
 * Query params:
 *   - scrape: "true" to also scrape full article content (slower)
 *   - summarize: "true" to generate brief AI summaries after ingestion
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scrapeContent = searchParams.get("scrape") === "true";
    const shouldSummarize = searchParams.get("summarize") === "true";

    const result = await ingestAllNews({ scrapeContent });

    // Fire-and-forget: run summarization, intelligence, ranking in background
    // Don't await — let the response return immediately
    runPostIngestionWork(result.articles, shouldSummarize).catch((err) => {
      console.error("[Ingest] Background work failed:", err);
    });

    return NextResponse.json({
      success: true,
      totalFetched: result.totalFetched,
      totalStored: result.totalStored,
      totalDuplicates: result.totalDuplicates,
      totalErrors: result.totalErrors,
      bySource: result.bySource,
      articleCount: result.articles.length,
      // Return lightweight article previews
      articles: result.articles.slice(0, 50).map((a) => ({
        title: a.title,
        url: a.url,
        source: a.sourceName,
        topic: a.topic,
        publishedAt: a.publishedAt,
        hasContent: !!a.content && a.content.length > 100,
        imageUrl: a.imageUrl,
      })),
    });
  } catch (error) {
    console.error("News ingestion error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to ingest news";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
