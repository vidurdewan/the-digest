import { NextRequest, NextResponse } from "next/server";
import { getGmailClient, fetchEmails, refreshTokensIfNeeded } from "@/lib/gmail";
import { parseNewsletter } from "@/lib/newsletter-parser";
import { getStoredTokens, storeTokens } from "@/lib/token-store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * GET /api/ingest/newsletters
 * Fetches and parses newsletters from connected Gmail account.
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

    // Parse into newsletters
    const newsletters = messages.map(parseNewsletter);

    // Store in Supabase if configured
    let storedCount = 0;
    if (isSupabaseConfigured() && supabase) {
      for (const nl of newsletters) {
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
      fetched: newsletters.length,
      stored: storedCount,
      newsletters: newsletters.map((nl) => ({
        id: nl.gmailMessageId,
        publication: nl.publication,
        subject: nl.subject,
        senderEmail: nl.senderEmail,
        receivedAt: nl.receivedAt,
        contentPreview: nl.contentText.slice(0, 300) + "...",
        contentLength: nl.contentText.length,
      })),
    });
  } catch (error) {
    console.error("Newsletter ingestion error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch newsletters";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
