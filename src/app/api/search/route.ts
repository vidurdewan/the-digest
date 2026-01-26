import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * GET /api/search?q=query&topic=all&dateRange=all&source=&limit=50
 * Full-text search across articles and newsletters.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = params.get("q") || "";
  const topic = params.get("topic") || "all";
  const dateRange = params.get("dateRange") || "all";
  const source = params.get("source") || "";
  const limit = Math.min(parseInt(params.get("limit") || "50", 10), 100);

  try {
    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({
        articles: [],
        total: 0,
        source: "none",
      });
    }

    let query = supabase
      .from("articles")
      .select(
        "*, summaries(id, brief, the_news, why_it_matters, the_context, key_entities, generated_at)",
        { count: "exact" }
      )
      .order("published_at", { ascending: false })
      .limit(limit);

    // Full-text search using Supabase text search or ilike fallback
    if (q.trim()) {
      // Use ilike for flexible matching across title and content
      query = query.or(
        `title.ilike.%${q}%,content.ilike.%${q}%,author.ilike.%${q}%`
      );
    }

    // Topic filter
    if (topic !== "all") {
      query = query.eq("topic", topic);
    }

    // Source filter
    if (source) {
      query = query.ilike("url", `%${source}%`);
    }

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date();
      const cutoffs: Record<string, number> = {
        today: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
      };
      const cutoff = cutoffs[dateRange];
      if (cutoff) {
        const cutoffDate = new Date(now.getTime() - cutoff).toISOString();
        query = query.gte("published_at", cutoffDate);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const articles = (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      source: row.url ? new URL(row.url).hostname.replace("www.", "") : "Unknown",
      sourceUrl: row.url || "",
      author: row.author || null,
      publishedAt: row.published_at,
      topic: row.topic,
      content: row.content || "",
      imageUrl: row.image_url || null,
      readingTimeMinutes: row.reading_time_minutes || 3,
      isRead: false,
      isSaved: false,
      watchlistMatches: [],
      summary: row.summaries?.[0]
        ? {
            id: row.summaries[0].id,
            articleId: row.id,
            brief: row.summaries[0].brief || "",
            theNews: row.summaries[0].the_news || "",
            whyItMatters: row.summaries[0].why_it_matters || "",
            theContext: row.summaries[0].the_context || "",
            keyEntities: row.summaries[0].key_entities || [],
            generatedAt: row.summaries[0].generated_at,
          }
        : undefined,
    }));

    return NextResponse.json({
      articles,
      total: count || articles.length,
      source: "supabase",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
