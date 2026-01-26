import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type EventType = "click" | "read" | "save" | "share" | "expand";

/**
 * POST /api/engagement
 * Record an engagement event.
 * Body: { articleId: string, eventType: EventType, durationSeconds?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleId, eventType, durationSeconds } = body;

    if (!articleId || !eventType) {
      return NextResponse.json(
        { error: "articleId and eventType are required" },
        { status: 400 }
      );
    }

    const validTypes: EventType[] = [
      "click",
      "read",
      "save",
      "share",
      "expand",
    ];
    if (!validTypes.includes(eventType)) {
      return NextResponse.json(
        { error: `eventType must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({ success: true, source: "local" });
    }

    const { error } = await supabase.from("engagement").insert({
      article_id: articleId,
      event_type: eventType,
      duration_seconds: durationSeconds || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, source: "supabase" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to record engagement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/engagement
 * Get engagement stats for ranking.
 * Query params:
 *   - type: "topic-scores" — returns engagement counts per topic
 *   - type: "article-scores" — returns engagement scores per article
 */
export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get("type") || "topic-scores";

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({ scores: {}, source: "none" });
    }

    if (type === "topic-scores") {
      // Count engagement events per topic by joining with articles
      const { data, error } = await supabase
        .from("engagement")
        .select("article_id, event_type, articles(topic)")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Aggregate: count events per topic, weighted by event type
      const weights: Record<string, number> = {
        click: 1,
        expand: 2,
        read: 3,
        save: 5,
        share: 4,
      };

      const topicScores: Record<string, number> = {};
      for (const row of data || []) {
        const topic =
          (row.articles as unknown as { topic: string })?.topic || "unknown";
        const weight = weights[row.event_type] || 1;
        topicScores[topic] = (topicScores[topic] || 0) + weight;
      }

      return NextResponse.json({ scores: topicScores, source: "supabase" });
    }

    if (type === "article-scores") {
      // Count engagement per article
      const { data, error } = await supabase
        .from("engagement")
        .select("article_id, event_type")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const weights: Record<string, number> = {
        click: 1,
        expand: 2,
        read: 3,
        save: 5,
        share: 4,
      };

      const articleScores: Record<string, number> = {};
      for (const row of data || []) {
        const weight = weights[row.event_type] || 1;
        articleScores[row.article_id] =
          (articleScores[row.article_id] || 0) + weight;
      }

      return NextResponse.json({
        scores: articleScores,
        source: "supabase",
      });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get engagement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
