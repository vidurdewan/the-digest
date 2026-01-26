import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * GET /api/search?q=query&topic=all&dateRange=all&date=YYYY-MM-DD&source=&limit=50
 * Full-text search across articles with intelligence data.
 * Supports full-text search via search_vector with ilike fallback.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = params.get("q") || "";
  const topic = params.get("topic") || "all";
  const dateRange = params.get("dateRange") || "all";
  const specificDate = params.get("date") || ""; // YYYY-MM-DD
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
        "*, summaries(id, brief, the_news, why_it_matters, the_context, key_entities, generated_at), article_intelligence(significance_score, story_type, connects_to, story_thread_id, watch_for_next, is_surprise_candidate)",
        { count: "exact" }
      )
      .order("published_at", { ascending: false })
      .limit(limit);

    // Full-text search: try search_vector first, fall back to ilike
    if (q.trim()) {
      // Convert query to tsquery-compatible format (space → &)
      const tsQuery = q
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .join(" & ");

      // Try full-text search via search_vector column
      // Falls back to ilike if search_vector doesn't exist
      try {
        query = query.textSearch("search_vector", tsQuery, {
          type: "plain",
          config: "english",
        });
      } catch {
        // Fallback to ilike if textSearch fails
        query = supabase
          .from("articles")
          .select(
            "*, summaries(id, brief, the_news, why_it_matters, the_context, key_entities, generated_at), article_intelligence(significance_score, story_type, connects_to, story_thread_id, watch_for_next, is_surprise_candidate)",
            { count: "exact" }
          )
          .or(
            `title.ilike.%${q}%,content.ilike.%${q}%,author.ilike.%${q}%`
          )
          .order("published_at", { ascending: false })
          .limit(limit);
      }
    }

    // Topic filter
    if (topic !== "all") {
      query = query.eq("topic", topic);
    }

    // Source filter
    if (source) {
      query = query.ilike("url", `%${source}%`);
    }

    // Specific date filter (takes precedence over dateRange)
    if (specificDate) {
      const dayStart = `${specificDate}T00:00:00.000Z`;
      const dayEnd = `${specificDate}T23:59:59.999Z`;
      query = query.gte("published_at", dayStart).lte("published_at", dayEnd);
    } else if (dateRange !== "all") {
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
      // If the full-text search column doesn't exist, retry with ilike
      if (error.message.includes("search_vector") && q.trim()) {
        const fallbackQuery = supabase
          .from("articles")
          .select(
            "*, summaries(id, brief, the_news, why_it_matters, the_context, key_entities, generated_at), article_intelligence(significance_score, story_type, connects_to, story_thread_id, watch_for_next, is_surprise_candidate)",
            { count: "exact" }
          )
          .or(
            `title.ilike.%${q}%,content.ilike.%${q}%,author.ilike.%${q}%`
          )
          .order("published_at", { ascending: false })
          .limit(limit);

        const fallbackResult = await fallbackQuery;
        if (fallbackResult.error) {
          return NextResponse.json(
            { error: fallbackResult.error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          articles: mapArticles(fallbackResult.data || []),
          total: fallbackResult.count || (fallbackResult.data || []).length,
          source: "supabase-ilike",
        });
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      articles: mapArticles(data || []),
      total: count || (data || []).length,
      source: "supabase",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapArticles(data: any[]) {
  return data.map((row) => {
    const intel = row.article_intelligence?.[0];

    return {
      id: row.id,
      title: row.title,
      source: row.url
        ? new URL(row.url).hostname.replace("www.", "")
        : "Unknown",
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
      intelligence: intel
        ? {
            significanceScore: intel.significance_score,
            storyType: intel.story_type,
            connectsTo: intel.connects_to || [],
            storyThreadId: intel.story_thread_id || undefined,
            watchForNext: intel.watch_for_next || undefined,
            isSurpriseCandidate: intel.is_surprise_candidate || false,
          }
        : undefined,
    };
  });
}
