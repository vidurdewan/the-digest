import { getGmailClient, fetchEmails, refreshTokensIfNeeded } from "@/lib/gmail";
import { parseNewsletter, isNewsletter } from "@/lib/newsletter-parser";
import { getStoredTokens, storeTokens } from "@/lib/token-store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  generateNewsletterSummary,
  generateVIPNewsletterSummary,
} from "@/lib/claude";

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

  // Refresh tokens if needed
  const freshTokens = await refreshTokensIfNeeded(tokens);
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

  // Parse into newsletters
  const parsed = newsletterMessages.map(parseNewsletter);

  // Normalize VIP publication names for case-insensitive matching
  const vipSet = new Set(vipPublications.map((p) => p.toLowerCase()));

  // Generate AI summaries in parallel (max 5 concurrent)
  const newslettersWithSummaries: NewsletterIngestionResult["newsletters"] = [];
  const batchSize = 5;
  for (let i = 0; i < parsed.length; i += batchSize) {
    const batch = parsed.slice(i, i + batchSize);
    const summaries = await Promise.all(
      batch.map((nl) => {
        const isVip = vipSet.has(nl.publication.toLowerCase());
        if (isVip) {
          return generateVIPNewsletterSummary(
            nl.publication,
            nl.subject,
            nl.contentText
          );
        }
        return generateNewsletterSummary(
          nl.publication,
          nl.subject,
          nl.contentText
        );
      })
    );
    for (let j = 0; j < batch.length; j++) {
      const isVip = vipSet.has(batch[j].publication.toLowerCase());
      newslettersWithSummaries.push({
        id: batch[j].gmailMessageId,
        publication: batch[j].publication,
        subject: batch[j].subject,
        senderEmail: batch[j].senderEmail,
        receivedAt: batch[j].receivedAt,
        content: batch[j].contentText,
        isVip,
        summary: summaries[j]
          ? {
              theNews: summaries[j]!.theNews,
              whyItMatters: summaries[j]!.whyItMatters,
              theContext: summaries[j]!.theContext,
              soWhat: summaries[j]!.soWhat,
              watchNext: summaries[j]!.watchNext,
              recruiterRelevance: summaries[j]!.recruiterRelevance,
            }
          : null,
      });
    }
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
    }));

    const BATCH_SIZE = 20;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      try {
        const { error, count } = await supabase
          .from("newsletters")
          .upsert(batch, { onConflict: "gmail_message_id", count: "exact" });

        if (!error) {
          storedCount += count ?? batch.length;
        } else {
          console.error("[Newsletter Ingestion] Batch upsert error:", error.message);
        }
      } catch {
        console.error("[Newsletter Ingestion] Batch upsert exception");
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
