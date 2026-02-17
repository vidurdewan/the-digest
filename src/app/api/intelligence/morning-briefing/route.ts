import { NextRequest, NextResponse } from "next/server";
import {
  supabaseAdmin as supabase,
  isSupabaseAdminConfigured as isSupabaseConfigured,
} from "@/lib/supabase";
import { generateMorningBriefing } from "@/lib/intelligence";
import { checkRateLimit } from "@/lib/rate-limit";

interface BriefingRow {
  since_marker: string;
  summary: string;
  what_changed: string[];
  action_items: string[];
  threads: Array<{ title: string; summary: string; articleCount: number; urgency: "high" | "medium" | "low" }>;
  generated_at: string;
}

function normalizeSince(since: string | null): Date {
  if (!since) {
    return new Date(Date.now() - 18 * 60 * 60 * 1000);
  }
  const parsed = new Date(since);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(Date.now() - 18 * 60 * 60 * 1000);
  }
  return parsed;
}

function makeSinceMarker(sinceDate: Date): string {
  return sinceDate.toISOString().slice(0, 13);
}

function buildHeuristicBriefing(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  articles: any[],
  sinceIso: string
): Omit<BriefingRow, "since_marker"> {
  const topicCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();

  for (const article of articles) {
    topicCounts.set(article.topic, (topicCounts.get(article.topic) || 0) + 1);
    const sourceName = article.sources?.name || "Unknown";
    sourceCounts.set(sourceName, (sourceCounts.get(sourceName) || 0) + 1);
  }

  const topTopics = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic, count]) => `${count} in ${topic.replace("-", " ")}`);

  const topSources = [...sourceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([source, count]) => `${source} (${count})`);

  return {
    summary:
      articles.length === 0
        ? "No major updates since your last check. Your briefing lane is clear right now."
        : `Since ${new Date(sinceIso).toLocaleString()}, ${articles.length} new developments landed. Momentum is concentrated in ${topTopics.join(", ") || "a few key areas"}, with early coverage led by ${topSources.join(", ") || "multiple outlets"}.`,
    what_changed:
      articles.length === 0
        ? ["No new high-signal stories detected in your window."]
        : [
            `New story volume: ${articles.length} articles since your last check.`,
            topTopics.length > 0
              ? `Topic concentration: ${topTopics.join("; ")}.`
              : "Topic concentration is still broad and fragmented.",
            topSources.length > 0
              ? `Most active sources: ${topSources.join(", ")}.`
              : "Source activity remained distributed.",
          ],
    action_items:
      articles.length === 0
        ? ["Check back later for fresh developments."]
        : [
            "Review the highest-significance thread first.",
            "Open one article per top topic to calibrate your view.",
            "Set a reminder on any unresolved developing story.",
          ],
    threads: [...topicCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([topic, count], index) => ({
        title: topic
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
        summary: `${count} new stories pushed this thread forward since your last check.`,
        articleCount: count,
        urgency: index === 0 ? "high" : index === 1 ? "medium" : "low",
      })),
    generated_at: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const sinceDate = normalizeSince(request.nextUrl.searchParams.get("since"));
    const sinceIso = sinceDate.toISOString();
    const sinceMarker = makeSinceMarker(sinceDate);

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({
        briefing: {
          since: sinceIso,
          generatedAt: new Date().toISOString(),
          summary: "Morning briefing is unavailable because the database is not configured.",
          whatChanged: ["Database connection is unavailable."],
          actionItems: ["Configure Supabase to unlock live briefings."],
          threads: [],
        },
        source: "fallback",
      });
    }

    const { data: cached } = await supabase
      .from("morning_briefings")
      .select("since_marker, summary, what_changed, action_items, threads, generated_at")
      .eq("since_marker", sinceMarker)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle<BriefingRow>();

    if (cached) {
      return NextResponse.json({
        briefing: {
          since: sinceIso,
          generatedAt: cached.generated_at,
          summary: cached.summary,
          whatChanged: cached.what_changed || [],
          actionItems: cached.action_items || [],
          threads: cached.threads || [],
        },
        source: "cache",
      });
    }

    return await generateAndStoreBriefing(sinceDate, false);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch morning briefing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, { maxRequests: 6, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests", retryAfterMs: rateLimit.retryAfterMs },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const sinceDate = normalizeSince(
      typeof body.since === "string" ? body.since : null
    );

    return await generateAndStoreBriefing(sinceDate, true);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate morning briefing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function generateAndStoreBriefing(sinceDate: Date, force: boolean) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  const sinceIso = sinceDate.toISOString();
  const sinceMarker = makeSinceMarker(sinceDate);

  const selectClause = `id, title, topic, published_at, url, content, source_tier, sources(name), summaries(brief), article_intelligence(significance_score)`;
  const { data: articles, error } = await supabase
    .from("articles")
    .select(selectClause)
    .gte("published_at", sinceIso)
    .order("published_at", { ascending: false })
    .limit(80);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const safeArticles = articles || [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiInput = safeArticles.map((article: any) => ({
    id: article.id,
    title: article.title,
    topic: article.topic,
    source: article.sources?.name || "Unknown",
    sourceTier: article.source_tier,
    brief: article.summaries?.[0]?.brief || article.content?.slice(0, 220) || "",
    significanceScore: article.article_intelligence?.[0]?.significance_score,
  }));

  const aiBriefing = force
    ? await generateMorningBriefing(aiInput, sinceIso)
    : aiInput.length > 0
      ? await generateMorningBriefing(aiInput, sinceIso)
      : null;

  const fallbackBriefing = buildHeuristicBriefing(safeArticles, sinceIso);

  const briefing = {
    since_marker: sinceMarker,
    summary: aiBriefing?.summary || fallbackBriefing.summary,
    what_changed: aiBriefing?.whatChanged || fallbackBriefing.what_changed,
    action_items: aiBriefing?.actionItems || fallbackBriefing.action_items,
    threads: aiBriefing?.threads || fallbackBriefing.threads,
    generated_at: new Date().toISOString(),
  };

  const { error: saveError } = await supabase.from("morning_briefings").upsert(
    briefing,
    { onConflict: "since_marker" }
  );

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  return NextResponse.json({
    briefing: {
      since: sinceIso,
      generatedAt: briefing.generated_at,
      summary: briefing.summary,
      whatChanged: briefing.what_changed,
      actionItems: briefing.action_items,
      threads: briefing.threads,
    },
    articleCount: safeArticles.length,
    source: aiBriefing ? "ai" : "heuristic",
  });
}
