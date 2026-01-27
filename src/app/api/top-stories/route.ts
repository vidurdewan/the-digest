import { NextRequest, NextResponse } from "next/server";
import { getTopStories } from "@/lib/story-ranker";

/**
 * GET /api/top-stories
 * Returns the highest-ranked articles with diversity enforcement.
 *
 * Query params:
 *   count        — number of top stories to return (default: 5)
 *   hoursBack    — look back window in hours (default: 24)
 *   maxPerPub    — max articles from same publication (default: 2)
 *   maxPerTopic  — max articles from same topic (default: 2)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get("count") || "5", 10);
    const hoursBack = parseInt(searchParams.get("hoursBack") || "24", 10);
    const maxPerPublication = parseInt(searchParams.get("maxPerPub") || "2", 10);
    const maxPerTopic = parseInt(searchParams.get("maxPerTopic") || "2", 10);

    const topStories = await getTopStories({
      count,
      hoursBack,
      maxPerPublication,
      maxPerTopic,
    });

    return NextResponse.json({
      success: true,
      count: topStories.length,
      stories: topStories,
    });
  } catch (error) {
    console.error("[Top Stories] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch top stories";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
