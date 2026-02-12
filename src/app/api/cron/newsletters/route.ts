import { NextRequest, NextResponse } from "next/server";
import { ingestNewsletters } from "@/lib/newsletter-ingestion";
import { isClaudeConfigured } from "@/lib/claude";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getStoredTokens } from "@/lib/token-store";

// Allow up to 3 minutes for newsletter ingestion
export const maxDuration = 180;

/**
 * GET /api/cron/newsletters
 * Vercel Cron endpoint — runs every morning before wake-up.
 * Lightweight cron that only fetches and summarizes newsletters,
 * so they're ready when you open the app.
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
    // Check if Gmail is connected
    const gmailTokens = await getStoredTokens();
    if (!gmailTokens?.refresh_token) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "Gmail not connected",
        duration: `${Date.now() - startTime}ms`,
      });
    }

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

    const newsletterStats = await ingestNewsletters({
      maxResults: 30,
      vipPublications,
    });

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      fetched: newsletterStats.fetched,
      filtered: newsletterStats.filtered,
      stored: newsletterStats.stored,
      totalEmails: newsletterStats.totalEmails,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron/Newsletters] Error:", error);
    const message =
      error instanceof Error ? error.message : "Newsletter cron failed";
    return NextResponse.json(
      { error: message, duration: `${Date.now() - startTime}ms` },
      { status: 500 }
    );
  }
}
