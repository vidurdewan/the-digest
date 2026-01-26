import { NextRequest, NextResponse } from "next/server";
import { getGmailClient, fetchEmails, refreshTokensIfNeeded } from "@/lib/gmail";
import { parseNewsletter, isNewsletter } from "@/lib/newsletter-parser";
import { getStoredTokens, storeTokens } from "@/lib/token-store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { generateNewsletterSummary } from "@/lib/claude";

/**
 * GET /api/ingest/newsletters
 * Fetches and parses newsletters from connected Gmail account.
 * Filters to actual newsletters, generates AI summaries.
 * Query params:
 *   - maxResults: number of emails to fetch (default 20)
 *   - afterDate: only fetch emails after this ISO date
 */
export async function GET(request: NextRequest) {
  try {
    // Get stored tokens
    const tokens = await getStoredTokens();
    if (!tokens || !tokens.refresh_token) {
      return NextResponse.json(
        { error: "Gmail not connected. Please connect Gmail first." },
        { status: 401 }
      );
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

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const maxResults = parseInt(searchParams.get("maxResults") || "20", 10);
    const afterDate = searchParams.get("afterDate") || undefined;

    // Fetch emails
    const gmail = getGmailClient(freshTokens);
    const messages = await fetchEmails(gmail, maxResults, afterDate);

    // Filter to newsletters only
    const newsletterMessages = messages.filter(isNewsletter);

    // Parse into newsletters
    const parsed = newsletterMessages.map(parseNewsletter);

    // Generate AI summaries in parallel (max 5 concurrent)
    const newslettersWithSummaries = [];
    const batchSize = 5;
    for (let i = 0; i < parsed.length; i += batchSize) {
      const batch = parsed.slice(i, i + batchSize);
      const summaries = await Promise.all(
        batch.map((nl) =>
          generateNewsletterSummary(nl.publication, nl.subject, nl.contentText)
        )
      );
      for (let j = 0; j < batch.length; j++) {
        newslettersWithSummaries.push({
          ...batch[j],
          summary: summaries[j],
        });
      }
    }

    // Store in Supabase if configured
    let storedCount = 0;
    if (isSupabaseConfigured() && supabase) {
      for (const nl of newslettersWithSummaries) {
        const { error } = await supabase.from("newsletters").upsert(
          {
            gmail_message_id: nl.gmailMessageId,
            publication: nl.publication,
            subject: nl.subject,
            sender_email: nl.senderEmail,
            content: nl.contentText,
            received_at: nl.receivedAt,
            is_read: false,
          },
          { onConflict: "gmail_message_id" }
        );
        if (!error) storedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      totalEmails: messages.length,
      fetched: newslettersWithSummaries.length,
      filtered: messages.length - newsletterMessages.length,
      stored: storedCount,
      newsletters: newslettersWithSummaries.map((nl) => ({
        id: nl.gmailMessageId,
        publication: nl.publication,
        subject: nl.subject,
        senderEmail: nl.senderEmail,
        receivedAt: nl.receivedAt,
        content: nl.contentText,
        summary: nl.summary
          ? {
              theNews: nl.summary.theNews,
              whyItMatters: nl.summary.whyItMatters,
              theContext: nl.summary.theContext,
              soWhat: nl.summary.soWhat,
              watchNext: nl.summary.watchNext,
              recruiterRelevance: nl.summary.recruiterRelevance,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Newsletter ingestion error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch newsletters";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
