import { NextRequest, NextResponse } from "next/server";
import { ingestAllNews, getStoredArticles } from "@/lib/article-ingestion";
import { summarizeBatchBrief, preGenerateTopFullSummaries } from "@/lib/summarization";
import { summarizeDecipheringBatch } from "@/lib/deciphering";
import { processIntelligenceBatch } from "@/lib/intelligence";
import { isClaudeConfigured } from "@/lib/claude";
import { ingestNewsletters } from "@/lib/newsletter-ingestion";
import { rankRecentArticles } from "@/lib/story-ranker";
import { retierAllContent } from "@/lib/source-tiers";
import { supabaseAdmin as supabase, isSupabaseAdminConfigured as isSupabaseConfigured } from "@/lib/supabase";
import { getStoredTokens } from "@/lib/token-store";
import { extractCompanyFromEdgarTitle } from "@/lib/sec-filter";
import { detectSignals } from "@/lib/signal-detection";
import type { ArticleForSignalDetection } from "@/lib/signal-detection";
import type { DocumentType } from "@/types";

// Allow up to 5 minutes for the full pipeline
export const maxDuration = 300;

/**
 * GET /api/cron/ingest
 * Vercel Cron endpoint — runs daily at 6 AM UTC.
 * Fetches news, generates summaries, and processes intelligence automatically.
 * Protected by CRON_SECRET in production.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret — always required to prevent unauthorized ingestion
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[Cron] CRON_SECRET is not set. Rejecting request.");
    return NextResponse.json(
      { error: "CRON_SECRET is not configured. Set it in environment variables." },
      { status: 500 }
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // 1. Fetch and store articles from all sources
    const result = await ingestAllNews({ scrapeContent: true });

    // 2. Generate brief summaries for new articles
    // Look up actual database UUIDs via content_hash (contentHash is a SHA, not a UUID)
    let summaryStats = null;
    if (isClaudeConfigured() && result.articles.length > 0) {
      const candidateArticles = result.articles
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
              id: s.id,       // ← actual database UUID
              title: s.title,
              content: s.content || s.title,
            }));

          if (articlesToSummarize.length > 0) {
            summaryStats = await summarizeBatchBrief(articlesToSummarize);
          }
        }
      }
    }

    // 2b. Generate Deciphering summaries for primary documents
    let decipheringStats = null;
    if (isClaudeConfigured() && result.articles.length > 0) {
      const primaryDocs = result.articles.filter(
        (a) => a.documentType && a.content && a.content.length > 50
      );

      if (primaryDocs.length > 0) {
        // We need article IDs from the database for storage.
        // Look up the stored articles by content_hash to get their UUIDs.
        const primaryDocArticles: Array<{
          id: string;
          title: string;
          content: string;
          documentType: DocumentType;
          companyName?: string;
        }> = [];

        if (isSupabaseConfigured() && supabase) {
          const hashes = primaryDocs.map((a) => a.contentHash);
          const { data: storedPrimary } = await supabase
            .from("articles")
            .select("id, title, content, content_hash, document_type")
            .in("content_hash", hashes);

          if (storedPrimary) {
            for (const stored of storedPrimary) {
              const original = primaryDocs.find(
                (a) => a.contentHash === stored.content_hash
              );
              if (stored.document_type && stored.content) {
                primaryDocArticles.push({
                  id: stored.id,
                  title: stored.title,
                  content: stored.content,
                  documentType: stored.document_type as DocumentType,
                  companyName:
                    original?.sourceId.startsWith("sec-edgar-")
                      ? extractCompanyFromEdgarTitle(stored.title) ?? undefined
                      : undefined,
                });
              }
            }
          }
        }

        if (primaryDocArticles.length > 0) {
          decipheringStats = await summarizeDecipheringBatch(primaryDocArticles);
        }
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

    // 3b. Detect early signals (no Claude API calls)
    let signalStats = null;
    if (isSupabaseConfigured() && supabase && result.articles.length > 0) {
      try {
        // Map content_hash → RawArticle for content/sourceName lookup
        const hashToRaw = new Map(
          result.articles.map((a) => [a.contentHash, a])
        );

        // Look up DB UUIDs + metadata in batches (avoid oversized .in() queries)
        const allHashes = result.articles.map((a) => a.contentHash);
        const HASH_BATCH = 100;
        const allStored: Array<{
          id: string;
          content_hash: string;
          source_tier: number | null;
          document_type: string | null;
          published_at: string | null;
        }> = [];

        for (let i = 0; i < allHashes.length; i += HASH_BATCH) {
          const hashChunk = allHashes.slice(i, i + HASH_BATCH);
          const { data } = await supabase
            .from("articles")
            .select("id, content_hash, source_tier, document_type, published_at")
            .in("content_hash", hashChunk);
          if (data) allStored.push(...data);
        }

        if (allStored.length > 0) {
          const signalArticles: ArticleForSignalDetection[] = allStored.map((stored) => {
            const raw = hashToRaw.get(stored.content_hash);
            return {
              id: stored.id,
              title: raw?.title || "",
              content: raw?.content || null,
              url: raw?.url || "",
              sourceTier: stored.source_tier || 3,
              sourceName: raw?.sourceName || "unknown",
              publishedAt: stored.published_at || new Date().toISOString(),
              documentType: stored.document_type || null,
            };
          });

          signalStats = await detectSignals(signalArticles);
        }
      } catch (err) {
        console.error("[Cron] Signal detection error:", err);
        signalStats = { error: err instanceof Error ? err.message : "Signal detection failed" };
      }
    }

    // 4. Compute ranking scores for recent articles
    let rankingStats = null;
    try {
      rankingStats = await rankRecentArticles();
    } catch (err) {
      console.error("[Cron] Ranking error:", err);
      rankingStats = {
        error: err instanceof Error ? err.message : "Ranking failed",
      };
    }

    // 4b. Pre-generate full summaries for top-ranked articles (instant load)
    let preGenStats = null;
    if (isClaudeConfigured()) {
      try {
        preGenStats = await preGenerateTopFullSummaries(15);
      } catch (err) {
        console.error("[Cron] Pre-generation error:", err);
        preGenStats = { error: err instanceof Error ? err.message : "Pre-generation failed" };
      }
    }

    // 5. Ingest newsletters from Gmail (if connected)
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

    // 6. Re-tier any content with stale tiers (fast — only updates mismatches)
    let retierStats = null;
    try {
      retierStats = await retierAllContent();
    } catch (err) {
      console.error("[Cron] Retier error:", err);
      retierStats = { error: err instanceof Error ? err.message : "Retier failed" };
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
      decipheringStats,
      intelligenceStats,
      signalStats,
      rankingStats,
      preGenStats,
      newsletterStats,
      retierStats,
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
