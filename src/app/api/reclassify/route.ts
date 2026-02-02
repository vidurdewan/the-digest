import { NextRequest, NextResponse } from "next/server";
import { classifyArticleTopics, isClaudeConfigured } from "@/lib/claude";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const maxDuration = 300;

// Keyword-based topic classification fallback (no AI needed)
const TOPIC_KEYWORDS: Record<string, RegExp> = {
  "fundraising-acquisitions":
    /\b(acqui|merger|funding round|series [a-f]|ipo fil|ipo price|spac|buyout|raises \$|raised \$|valuation|venture fund|fundrais)\b/i,
  "executive-movements":
    /\b(ceo hire|cto join|appoint|named ceo|named cto|steps down as|resign|executive.*hire|board.*appoint|chief.*officer.*join)\b/i,
  "automotive":
    /\b(electric vehicle|autonomous driv|ev sales|tesla|rivian|waymo|self-driving|automotive)\b/i,
  "geopolitics":
    /\b(sanction|tariff|diplomat|treaty|nato|united nations|foreign policy|trade war|geopolit)\b/i,
  "science-tech":
    /\b(artificial intelligence|machine learning|quantum comput|cybersecur|open.?source|software|AI model|neural|chip|semiconductor|spacex|rocket|nasa)\b/i,
  "politics":
    /\b(congress|senate|white house|legislation|executive order|democrat|republican|election|bipartisan|bill pass)\b/i,
  "financial-markets":
    /\b(stock market|wall street|fed rate|interest rate|earnings|quarterly result|s&p 500|nasdaq|dow jones|treasury|inflation|gdp|economic data|sec fil|10-k|8-k)\b/i,
};

function classifyByKeywords(
  title: string,
  content: string
): string | null {
  const text = `${title} ${content.slice(0, 500)}`.toLowerCase();
  let bestTopic: string | null = null;
  let bestScore = 0;

  for (const [topic, regex] of Object.entries(TOPIC_KEYWORDS)) {
    const matches = text.match(new RegExp(regex.source, "gi"));
    const score = matches ? matches.length : 0;
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  return bestScore >= 1 ? bestTopic : null;
}

/**
 * POST /api/reclassify?topic=fundraising-acquisitions&limit=200&mode=keywords
 * Reclassifies articles using AI (default) or keyword matching (mode=keywords).
 * Optional query params:
 *   - topic: only reclassify articles currently tagged with this topic
 *   - limit: max articles to process (default 200)
 *   - mode: "ai" (default) or "keywords"
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  const topicFilter = searchParams.get("topic") || undefined;
  const limit = parseInt(searchParams.get("limit") || "200", 10);
  const mode = searchParams.get("mode") || (isClaudeConfigured() ? "ai" : "keywords");

  try {
    let query = supabase
      .from("articles")
      .select("id, title, content, topic")
      .order("published_at", { ascending: false })
      .limit(limit);

    if (topicFilter) {
      query = query.eq("topic", topicFilter);
    }

    const { data: articles, error } = await query;

    if (error) throw error;
    if (!articles || articles.length === 0) {
      return NextResponse.json({ reclassified: 0, total: 0, mode });
    }

    const toClassify = articles
      .filter((a: { content: string | null }) => a.content && a.content.length > 50)
      .map((a: { id: string; title: string; content: string; topic: string }) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        currentTopic: a.topic,
      }));

    let reclassified = 0;

    // Second pass: articles left in the filtered topic that don't match its keywords
    // should be moved to a sensible default (e.g. Fortune articles → financial-markets)
    const DEFAULT_REASSIGN: Record<string, string> = {
      "fundraising-acquisitions": "financial-markets",
    };

    if (mode === "ai" && isClaudeConfigured()) {
      // AI-based classification in batches of 20
      for (let i = 0; i < toClassify.length; i += 20) {
        const batch = toClassify.slice(i, i + 20);
        const results = await classifyArticleTopics(batch);
        if (!results) continue;

        const updates = results.filter(
          (r, idx) => r.topic !== batch[idx].currentTopic
        );

        if (updates.length > 0) {
          await Promise.allSettled(
            updates.map((u) =>
              supabase!
                .from("articles")
                .update({ topic: u.topic })
                .eq("id", u.id)
            )
          );
          reclassified += updates.length;
        }
      }
    } else {
      // Keyword-based classification
      const updates: { id: string; topic: string }[] = [];

      for (const article of toClassify) {
        const newTopic = classifyByKeywords(article.title, article.content);
        if (newTopic && newTopic !== article.currentTopic) {
          updates.push({ id: article.id, topic: newTopic });
        } else if (
          !newTopic &&
          topicFilter &&
          DEFAULT_REASSIGN[article.currentTopic]
        ) {
          // Article doesn't match ANY topic keywords and is in a filtered topic
          // with a default reassignment — move it out
          updates.push({
            id: article.id,
            topic: DEFAULT_REASSIGN[article.currentTopic],
          });
        }
      }

      if (updates.length > 0) {
        await Promise.allSettled(
          updates.map((u) =>
            supabase!
              .from("articles")
              .update({ topic: u.topic })
              .eq("id", u.id)
          )
        );
        reclassified = updates.length;
      }
    }

    return NextResponse.json({
      reclassified,
      total: toClassify.length,
      mode,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reclassification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
