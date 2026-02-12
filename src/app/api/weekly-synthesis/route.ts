import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase, isSupabaseAdminConfigured as isSupabaseConfigured } from "@/lib/supabase";
import { isClaudeConfigured } from "@/lib/claude";
import {
  generateWeeklySynthesis,
  storeWeeklySynthesis,
} from "@/lib/intelligence";
import { validateApiRequest } from "@/lib/api-auth";

/**
 * GET /api/weekly-synthesis?week=YYYY-MM-DD
 * Fetch the latest or a specific week's synthesis.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const week = params.get("week"); // YYYY-MM-DD of week start

  try {
    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({ synthesis: null, source: "none" });
    }

    let query = supabase
      .from("weekly_synthesis")
      .select("*")
      .order("week_start", { ascending: false })
      .limit(1);

    if (week) {
      query = supabase
        .from("weekly_synthesis")
        .select("*")
        .eq("week_start", week)
        .limit(1);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = data?.[0];
    if (!row) {
      return NextResponse.json({ synthesis: null });
    }

    return NextResponse.json({
      synthesis: {
        id: row.id,
        weekStart: row.week_start,
        weekEnd: row.week_end,
        synthesis: row.synthesis,
        threads: row.threads || [],
        patterns: row.patterns || [],
        generatedAt: row.generated_at,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch synthesis";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/weekly-synthesis
 * Generate a new weekly synthesis for the current or specified week.
 */
export async function POST(request: NextRequest) {
  const auth = validateApiRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    if (!isClaudeConfigured()) {
      return NextResponse.json(
        { error: "Claude API not configured" },
        { status: 503 }
      );
    }

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    // Calculate week boundaries
    const body = await request.json().catch(() => ({}));
    const now = new Date();
    const weekEnd = body.weekEnd
      ? new Date(body.weekEnd)
      : now;
    const weekStart = body.weekStart
      ? new Date(body.weekStart)
      : new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    // Fetch articles from the week
    const { data: articles, error: fetchError } = await supabase
      .from("articles")
      .select(
        "id, title, topic, url, content, summaries(brief), article_intelligence(significance_score, story_type)"
      )
      .gte("published_at", `${weekStartStr}T00:00:00.000Z`)
      .lte("published_at", `${weekEndStr}T23:59:59.999Z`)
      .order("published_at", { ascending: false })
      .limit(100);

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json(
        { error: "No articles found for this week" },
        { status: 404 }
      );
    }

    // Map to synthesis input format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const synthesisInput = articles.map((a: any) => ({
      id: a.id,
      title: a.title,
      topic: a.topic,
      source: a.url
        ? new URL(a.url).hostname.replace("www.", "")
        : "Unknown",
      brief: a.summaries?.[0]?.brief || a.content?.slice(0, 200) || "",
      storyType: a.article_intelligence?.[0]?.story_type,
      significanceScore: a.article_intelligence?.[0]?.significance_score,
    }));

    // Generate synthesis
    const result = await generateWeeklySynthesis(
      synthesisInput,
      weekStartStr,
      weekEndStr
    );

    if (!result) {
      return NextResponse.json(
        { error: "Failed to generate synthesis" },
        { status: 500 }
      );
    }

    // Store synthesis
    await storeWeeklySynthesis(
      weekStartStr,
      weekEndStr,
      result.synthesis,
      result.threads,
      result.patterns
    );

    return NextResponse.json({
      synthesis: {
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        synthesis: result.synthesis,
        threads: result.threads,
        patterns: result.patterns,
        generatedAt: new Date().toISOString(),
      },
      tokens: {
        input: result.totalInputTokens,
        output: result.totalOutputTokens,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Synthesis generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
