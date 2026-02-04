import { getGmailClient, fetchEmails, refreshTokensIfNeeded } from "@/lib/gmail";
import { parseNewsletter, isNewsletter } from "@/lib/newsletter-parser";
import { getStoredTokens, storeTokens, clearTokens } from "@/lib/token-store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  generateVIPNewsletterSummary,
  generateBatchNewsletterSummaries,
  getSourceWeight,
  type NewsletterSummaryResult,
} from "@/lib/claude";
import { getNewsletterSourceTier, type SourceTier } from "@/lib/source-tiers";
import { isPromotionalContent } from "@/lib/rss-fetcher";

export interface NewsletterIngestionResult {
  fetched: number;
  filtered: number;
  stored: number;
  totalEmails: number;
  newsletters: Array<{
    id: string;
    publication: string;
    subject: string;
    senderEmail: string;
    receivedAt: string;
    content: string;
    isVip: boolean;
    sourceTier: SourceTier;
    summary: {
      theNews: string;
      whyItMatters: string;
      theContext: string;
      soWhat: string;
      watchNext: string;
      recruiterRelevance: string;
    } | null;
  }>;
}

export interface NewsletterIngestionOptions {
  maxResults?: number;
  afterDate?: string;
  vipPublications?: string[];
}

/**
 * Auto-detect the afterDate by querying Supabase for the most recent newsletter.
 * Falls back to 7 days ago if no newsletters exist.
 */
async function getLastNewsletterDate(): Promise<string> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase
        .from("newsletters")
        .select("received_at")
        .order("received_at", { ascending: false })
        .limit(1)
        .single();

      if (data?.received_at) {
        return data.received_at;
      }
    } catch {
      // Table may not exist or be empty
    }
  }

  // Fallback: 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return sevenDaysAgo.toISOString();
}

/**
 * Shared newsletter ingestion logic.
 * Used by both the cron job and the manual ingest route.
 * Handles token refresh, Gmail fetch, filtering, parsing, summarization, and Supabase storage.
 */
export async function ingestNewsletters(
  options?: NewsletterIngestionOptions
): Promise<NewsletterIngestionResult> {
  const { maxResults = 20, vipPublications = [] } = options || {};

  // Get stored tokens
  const tokens = await getStoredTokens();
  if (!tokens || !tokens.refresh_token) {
    throw new Error("Gmail not connected. Please connect Gmail first.");
  }

  // Refresh tokens if needed — clear stale tokens on invalid_grant
  let freshTokens;
  try {
    freshTokens = await refreshTokensIfNeeded(tokens);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("expired or revoked")) {
      await clearTokens();
    }
    throw err;
  }
  if (freshTokens !== tokens) {
    const updatedTokens = freshTokens as Record<string, unknown>;
    await storeTokens({
      access_token: (updatedTokens.access_token as string) || null,
      refresh_token:
        (updatedTokens.refresh_token as string) ||
        tokens.refresh_token ||
        null,
      expiry_date: (updatedTokens.expiry_date as number) || null,
      scope: (updatedTokens.scope as string) || null,
      token_type: (updatedTokens.token_type as string) || null,
    });
  }

  // Auto-detect afterDate if not provided — only fetch new emails
  const afterDate = options?.afterDate || (await getLastNewsletterDate());

  // Fetch emails from Gmail
  const gmail = getGmailClient(freshTokens);
  const messages = await fetchEmails(gmail, maxResults, afterDate);

  // Filter to newsletters only
  const newsletterMessages = messages.filter(isNewsletter);

  // Parse into newsletters and filter out promotional content
  const parsed = newsletterMessages
    .map(parseNewsletter)
    .filter((nl) => !isPromotionalContent(nl.subject, ""));

  // VIP matching helper — fuzzy substring matching
  const vipLowerList = vipPublications.map((p) => p.toLowerCase().trim());
  function isVipPublication(publication: string): boolean {
    const pubLower = publication.toLowerCase().trim();
    for (const vip of vipLowerList) {
      if (pubLower === vip) return true;
      if (vip.length >= 3 && (pubLower.includes(vip) || vip.includes(pubLower))) return true;
    }
    return false;
  }

  // Split into VIP (individual calls) and non-VIP (batched calls)
  const vipItems: typeof parsed = [];
  const nonVipItems: typeof parsed = [];
  for (const nl of parsed) {
    if (isVipPublication(nl.publication)) {
      vipItems.push(nl);
    } else {
      nonVipItems.push(nl);
    }
  }

  // Build all summary work concurrently
  const summaryMap = new Map<string, NewsletterSummaryResult | null>();

  const work: Promise<void>[] = [];

  // VIP newsletters — individual calls, all concurrent
  for (const nl of vipItems) {
    work.push(
      generateVIPNewsletterSummary(nl.publication, nl.subject, nl.contentText)
        .then((result) => { summaryMap.set(nl.gmailMessageId, result); })
    );
  }

  // Non-VIP newsletters — batch 5 per API call, all batches concurrent
  const nonVipBatchSize = 5;
  for (let i = 0; i < nonVipItems.length; i += nonVipBatchSize) {
    const batch = nonVipItems.slice(i, i + nonVipBatchSize);
    work.push(
      generateBatchNewsletterSummaries(
        batch.map((nl) => ({
          publication: nl.publication,
          subject: nl.subject,
          content: nl.contentText,
          weight: getSourceWeight(nl.publication),
        }))
      ).then((result) => {
        for (let j = 0; j < batch.length; j++) {
          summaryMap.set(batch[j].gmailMessageId, result?.results[j] ?? null);
        }
      })
    );
  }

  await Promise.allSettled(work);

  // Assemble results
  const newslettersWithSummaries: NewsletterIngestionResult["newsletters"] = [];
  for (const nl of parsed) {
    const isVip = isVipPublication(nl.publication);
    const sourceTier = getNewsletterSourceTier(nl.publication, nl.senderEmail);
    const summary = summaryMap.get(nl.gmailMessageId) ?? null;
    newslettersWithSummaries.push({
      id: nl.gmailMessageId,
      publication: nl.publication,
      subject: nl.subject,
      senderEmail: nl.senderEmail,
      receivedAt: nl.receivedAt,
      content: nl.contentText,
      isVip,
      sourceTier,
      summary: summary
        ? {
            theNews: summary.theNews,
            whyItMatters: summary.whyItMatters,
            theContext: summary.theContext,
            soWhat: summary.soWhat,
            watchNext: summary.watchNext,
            recruiterRelevance: summary.recruiterRelevance,
          }
        : null,
    });
  }

  // Store in Supabase — batch upserts for performance
  let storedCount = 0;
  if (isSupabaseConfigured() && supabase) {
    const rows = newslettersWithSummaries.map((nl) => ({
      gmail_message_id: nl.id,
      publication: nl.publication,
      subject: nl.subject,
      sender_email: nl.senderEmail,
      content: nl.content,
      received_at: nl.receivedAt,
      is_read: false,
      is_vip: nl.isVip,
      source_tier: nl.sourceTier,
      summary_the_news: nl.summary?.theNews || null,
      summary_why_it_matters: nl.summary?.whyItMatters || null,
      summary_the_context: nl.summary?.theContext || null,
      summary_so_what: nl.summary?.soWhat || null,
      summary_watch_next: nl.summary?.watchNext || null,
      summary_recruiter_relevance: nl.summary?.recruiterRelevance || null,
    }));

    const BATCH_SIZE = 20;
    const batches: (typeof rows)[] = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      batches.push(rows.slice(i, i + BATCH_SIZE));
    }

    const batchResults = await Promise.allSettled(
      batches.map(async (batch) => {
        const { error, count } = await supabase!
          .from("newsletters")
          .upsert(batch, { onConflict: "gmail_message_id", count: "exact" });
        if (error) throw error;
        return count ?? batch.length;
      })
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        storedCount += r.value;
      } else {
        console.error("[Newsletter Ingestion] Batch upsert error:", r.reason);
      }
    }

    // Update last_newsletter_fetch timestamp in settings
    try {
      await supabase.from("settings").upsert(
        {
          id: "00000000-0000-0000-0000-000000000001",
          last_newsletter_fetch: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch {
      // Non-critical — settings update failure is okay
    }
  }

  return {
    fetched: newslettersWithSummaries.length,
    filtered: messages.length - newsletterMessages.length,
    stored: storedCount,
    totalEmails: messages.length,
    newsletters: newslettersWithSummaries,
  };
}
