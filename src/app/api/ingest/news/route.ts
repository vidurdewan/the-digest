import { NextRequest, NextResponse } from "next/server";
import { ingestAllNews, getStoredArticles } from "@/lib/article-ingestion";
import { summarizeBatchBrief } from "@/lib/summarization";
import { processIntelligenceBatch } from "@/lib/intelligence";
import { isClaudeConfigured } from "@/lib/claude";

/**
 * GET /api/ingest/news
 * Fetches news from all active RSS feeds and NewsAPI sources.
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

    // Optionally generate brief summaries for newly ingested articles
    let summaryStats = null;
    if (shouldSummarize && isClaudeConfigured() && result.articles.length > 0) {
      const articlesToSummarize = result.articles
        .filter((a) => a.content && a.content.length > 50)
        .slice(0, 50)
        .map((a) => ({
          id: a.contentHash, // Will need article DB IDs for real use
          title: a.title,
          content: a.content || a.title,
        }));

      if (articlesToSummarize.length > 0) {
        summaryStats = await summarizeBatchBrief(articlesToSummarize);
      }
    }

    // After summarization, process intelligence for top articles
    let intelligenceStats = null;
    if (isClaudeConfigured() && result.articles.length > 0) {
      // Get stored articles with their DB IDs for intelligence processing
      const { articles: storedArticles } = await getStoredArticles({ limit: 20 });
      const intelligenceArticles = storedArticles
        .filter((a: { content?: string | null }) => a.content && (a.content as string).length > 50)
        .slice(0, 20)
        .map((a: { id: string; title: string; content?: string | null; url?: string | null; topic?: string | null }) => ({
          id: a.id,
          title: a.title,
          content: a.content || a.title,
          source: a.url || "",
          topic: a.topic || "",
        }));

      if (intelligenceArticles.length > 0) {
        intelligenceStats = await processIntelligenceBatch(intelligenceArticles);
      }
    }

    return NextResponse.json({
      success: true,
      totalFetched: result.totalFetched,
      totalStored: result.totalStored,
      totalDuplicates: result.totalDuplicates,
      totalErrors: result.totalErrors,
      bySource: result.bySource,
      articleCount: result.articles.length,
      summaryStats,
      intelligenceStats,
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
