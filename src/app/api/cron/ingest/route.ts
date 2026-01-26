import { NextRequest, NextResponse } from "next/server";
import { ingestAllNews, getStoredArticles } from "@/lib/article-ingestion";
import { summarizeBatchBrief } from "@/lib/summarization";
import { processIntelligenceBatch } from "@/lib/intelligence";
import { isClaudeConfigured } from "@/lib/claude";

/**
 * GET /api/cron/ingest
 * Vercel Cron endpoint — runs every 15 minutes.
 * Fetches news, generates summaries, and processes intelligence automatically.
 * Protected by CRON_SECRET in production.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret in production
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const startTime = Date.now();

  try {
    // 1. Fetch and store articles from all sources
    const result = await ingestAllNews({ scrapeContent: true });

    // 2. Generate brief summaries for new articles
    let summaryStats = null;
    if (isClaudeConfigured() && result.articles.length > 0) {
      const articlesToSummarize = result.articles
        .filter((a) => a.content && a.content.length > 50)
        .slice(0, 50)
        .map((a) => ({
          id: a.contentHash,
          title: a.title,
          content: a.content || a.title,
        }));

      if (articlesToSummarize.length > 0) {
        summaryStats = await summarizeBatchBrief(articlesToSummarize);
      }
    }

    // 3. Process intelligence for top articles
    let intelligenceStats = null;
    if (isClaudeConfigured() && result.articles.length > 0) {
      const { articles: storedArticles } = await getStoredArticles({
        limit: 20,
      });
      const intelligenceArticles = storedArticles
        .filter(
          (a: { content?: string | null }) =>
            a.content && (a.content as string).length > 50
        )
        .slice(0, 20)
        .map(
          (a: {
            id: string;
            title: string;
            content?: string | null;
            url?: string | null;
            topic?: string | null;
          }) => ({
            id: a.id,
            title: a.title,
            content: a.content || a.title,
            source: a.url || "",
            topic: a.topic || "",
          })
        );

      if (intelligenceArticles.length > 0) {
        intelligenceStats = await processIntelligenceBatch(
          intelligenceArticles
        );
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      totalFetched: result.totalFetched,
      totalStored: result.totalStored,
      totalDuplicates: result.totalDuplicates,
      totalErrors: result.totalErrors,
      summaryStats,
      intelligenceStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Ingestion error:", error);
    const message =
      error instanceof Error ? error.message : "Cron ingestion failed";
    return NextResponse.json(
      { error: message, duration: `${Date.now() - startTime}ms` },
      { status: 500 }
    );
  }
}
