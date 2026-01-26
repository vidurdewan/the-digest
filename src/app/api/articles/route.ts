import { NextRequest, NextResponse } from "next/server";
import { getStoredArticles } from "@/lib/article-ingestion";

/**
 * GET /api/articles
 * Returns stored articles from the database.
 * Query params:
 *   - topic: filter by topic category
 *   - limit: max results (default 50)
 *   - offset: pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const topic = searchParams.get("topic") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const { articles, count } = await getStoredArticles({
      topic,
      limit,
      offset,
    });

    return NextResponse.json({
      articles,
      count,
      limit,
      offset,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch articles";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
