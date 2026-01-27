import { NextResponse } from "next/server";
import { rankRecentArticles } from "@/lib/story-ranker";

/**
 * POST /api/rank
 * Compute ranking scores for recent articles and store in the database.
 */
export async function POST() {
  try {
    const startTime = Date.now();
    const stats = await rankRecentArticles();
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
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
export async function GET() {
  return POST();
}
