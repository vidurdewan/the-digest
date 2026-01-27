import { NextRequest, NextResponse } from "next/server";
import { ingestNewsletters } from "@/lib/newsletter-ingestion";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const maxDuration = 300;

/**
 * GET /api/ingest/newsletters
 * Fetches and parses newsletters from connected Gmail account.
 * Uses shared ingestion logic with VIP support.
 * Query params:
 *   - maxResults: number of emails to fetch (default 20)
 *   - afterDate: only fetch emails after this ISO date
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const maxResults = parseInt(searchParams.get("maxResults") || "20", 10);
    const afterDate = searchParams.get("afterDate") || undefined;

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

    const result = await ingestNewsletters({
      maxResults,
      afterDate,
      vipPublications,
    });

    return NextResponse.json({
      success: true,
      totalEmails: result.totalEmails,
      fetched: result.fetched,
      filtered: result.filtered,
      stored: result.stored,
      newsletters: result.newsletters.map((nl) => ({
        id: nl.id,
        publication: nl.publication,
        subject: nl.subject,
        senderEmail: nl.senderEmail,
        receivedAt: nl.receivedAt,
        content: nl.content,
        isVip: nl.isVip,
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
