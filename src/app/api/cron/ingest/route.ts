import { NextRequest, NextResponse } from "next/server";
import { ingestAllNews, getStoredArticles } from "@/lib/article-ingestion";
import { summarizeBatchBrief } from "@/lib/summarization";
import { processIntelligenceBatch } from "@/lib/intelligence";
import { isClaudeConfigured } from "@/lib/claude";
import { ingestNewsletters } from "@/lib/newsletter-ingestion";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getStoredTokens } from "@/lib/token-store";

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
        intelligenceStats = await processIntelligenceBatch(
          intelligenceArticles
        );
      }
    }

    // 4. Ingest newsletters from Gmail (if connected)
    let newsletterStats = null;
    const gmailTokens = await getStoredTokens();
    if (gmailTokens?.refresh_token) {
      try {
        // Load VIP publications from settings
        let vipPublications: string[] = [];
        if (isSupabaseConfigured() && supabase) {
          try {
            const { data } = await supabase
              .from("settings")
              .select("vip_newsletters")
              .limit(1)
              .single();
            if (data?.vip_newsletters && Array.isArray(data.vip_newsletters)) {
              vipPublications = data.vip_newsletters;
            }
          } catch {
            // Settings may not exist yet
          }
        }

        newsletterStats = await ingestNewsletters({
          maxResults: 30,
          vipPublications,
        });
      } catch (err) {
        console.error("[Cron] Newsletter ingestion error:", err);
        newsletterStats = {
          error:
            err instanceof Error
              ? err.message
              : "Newsletter ingestion failed",
        };
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
      newsletterStats,
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
