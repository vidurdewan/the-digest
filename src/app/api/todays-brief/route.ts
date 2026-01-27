import { NextResponse } from "next/server";
import { isClaudeConfigured } from "@/lib/claude";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getStoredArticles } from "@/lib/article-ingestion";
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client = new Anthropic({ apiKey });
  return client;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * GET /api/todays-brief
 * Returns a synthesized daily narrative brief.
 * Caches in Supabase `daily_briefs` table (keyed by date).
 */
export async function GET() {
  try {
    if (!isClaudeConfigured()) {
      return NextResponse.json(
        { error: "Claude API is not configured. Set ANTHROPIC_API_KEY." },
        { status: 503 }
      );
    }

    const todayKey = getTodayKey();

    // Try to return cached brief
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data } = await supabase
          .from("daily_briefs")
          .select("brief")
          .eq("date_key", todayKey)
          .single();

        if (data?.brief) {
          return NextResponse.json({ brief: data.brief, cached: true });
        }
      } catch {
        // Table may not exist yet — continue to generate
      }
    }

    // Fetch top articles for the brief
    const { articles } = await getStoredArticles({ limit: 25 });
    const typedArticles = articles as { title: string; content?: string | null; topic?: string | null; url?: string | null }[];

    if (typedArticles.length === 0) {
      return NextResponse.json(
        { error: "No articles available to generate a brief." },
        { status: 404 }
      );
    }

    const anthropic = getClient();
    if (!anthropic) {
      return NextResponse.json(
        { error: "Failed to initialize Claude client" },
        { status: 500 }
      );
    }

    // Build article context
    const articleText = typedArticles
      .map(
        (a, i) =>
          `[${i + 1}] "${a.title}" (topic: ${a.topic || "general"})${a.content ? `\n   ${a.content.slice(0, 300)}` : ""}`
      )
      .join("\n\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: `You are writing a morning brief for an executive who follows VC/startups, financial markets, geopolitics, tech, and business news.

Based on today's articles, write a concise 3-4 paragraph morning narrative. This should read like a well-written morning newsletter — flowing prose, no bullet points, no section headers. Connect the dots between stories where relevant. Highlight what matters most and why.

Keep it under 400 words. Write in a confident, informed tone — like a trusted analyst giving a morning rundown over coffee.

Today's articles:

${articleText}`,
        },
      ],
    });

    const brief =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Cache the brief
    if (isSupabaseConfigured() && supabase && brief) {
      try {
        await supabase
          .from("daily_briefs")
          .upsert({ date_key: todayKey, brief, generated_at: new Date().toISOString() }, { onConflict: "date_key" });
      } catch {
        // Caching failure is non-critical
      }
    }

    return NextResponse.json({
      brief,
      cached: false,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Brief generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
