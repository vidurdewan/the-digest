import { NextRequest, NextResponse } from "next/server";
import { getStoredArticles } from "@/lib/article-ingestion";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * GET /api/articles
 * Returns stored articles from the database.
 * Query params:
 *   - topic: filter by topic category
 *   - limit: max results (default 50)
 *   - offset: pagination offset (default 0)
 *   - countOnly: "true" for lightweight polling (returns count + latest timestamp only)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const countOnly = searchParams.get("countOnly") === "true";

    // Lightweight polling endpoint — no joins, just count + latest timestamp
    if (countOnly) {
      if (!isSupabaseConfigured() || !supabase) {
        return NextResponse.json({ count: 0, latestPublishedAt: null });
      }

      const { count, data, error } = await supabase
        .from("articles")
        .select("published_at", { count: "exact", head: false })
        .order("published_at", { ascending: false })
        .limit(1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        count: count || 0,
        latestPublishedAt: data?.[0]?.published_at || null,
      });
    }

    // Full articles fetch
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
