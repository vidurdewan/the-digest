import { NextRequest, NextResponse } from "next/server";
import { rankRecentArticles, rankAllArticles } from "@/lib/story-ranker";
import { validateApiRequest } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";

// Allow up to 5 minutes for full re-rank
export const maxDuration = 300;

/**
 * POST /api/rank
 * Compute ranking scores for recent articles and store in the database.
 * Use ?all=true to re-score ALL articles (not just last 24h).
 */
export async function POST(request: NextRequest) {
  const auth = validateApiRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const rateLimit = checkRateLimit(request);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests", retryAfterMs: rateLimit.retryAfterMs },
      { status: 429 }
    );
  }

  try {
    const all = request.nextUrl.searchParams.get("all") === "true";
    const startTime = Date.now();
    const stats = all ? await rankAllArticles() : await rankRecentArticles();
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      mode: all ? "all" : "recent",
      duration: `${duration}ms`,
      ...stats,
    });
  } catch (error) {
    console.error("[Rank] Error:", error);
    const message = error instanceof Error ? error.message : "Ranking failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/rank
 * Same as POST — allows triggering via browser for convenience.
 */
export async function GET(request: NextRequest) {
  return POST(request);
}
