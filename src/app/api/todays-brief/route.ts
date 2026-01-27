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
 * Now includes VIP newsletter content prominently.
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

    // Fetch VIP newsletters from today
    let vipNewsletterContext = "";
    let vipPublications: string[] = [];
    if (isSupabaseConfigured() && supabase) {
      // Load VIP list from settings
      try {
        const { data: settingsData } = await supabase
          .from("settings")
          .select("vip_newsletters")
          .limit(1)
          .single();
        if (settingsData?.vip_newsletters && Array.isArray(settingsData.vip_newsletters)) {
          vipPublications = settingsData.vip_newsletters;
        }
      } catch {
        // Settings may not exist
      }

      // Fetch recent VIP newsletters (last 24 hours)
      if (vipPublications.length > 0) {
        try {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);

          const { data: vipNewsletters } = await supabase
            .from("newsletters")
            .select("publication, subject, content")
            .eq("is_vip", true)
            .gte("received_at", yesterday.toISOString())
            .order("received_at", { ascending: false })
            .limit(5);

          if (vipNewsletters && vipNewsletters.length > 0) {
            vipNewsletterContext = vipNewsletters
              .map(
                (nl: { publication: string; subject: string; content: string }, i: number) =>
                  `[VIP ${i + 1}] ${nl.publication} — "${nl.subject}"\n${nl.content.slice(0, 3000)}`
              )
              .join("\n\n---\n\n");
          }
        } catch {
          // Newsletter fetch failure is non-critical
        }
      }
    }

    if (typedArticles.length === 0 && !vipNewsletterContext) {
      return NextResponse.json(
        { error: "No articles or newsletters available to generate a brief." },
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

    // Build VIP section for the prompt
    const vipSection = vipNewsletterContext
      ? `\n\nMUST-READ NEWSLETTERS (VIP — always feature their insights prominently, even if other stories seem bigger):
The following are from ${vipPublications.join(", ")} — the reader's most trusted sources. Always integrate their analysis and insights into the brief.

${vipNewsletterContext}`
      : "";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `You are writing a morning brief for an executive who follows VC/startups, financial markets, geopolitics, tech, and business news.

Based on today's articles${vipNewsletterContext ? " and must-read newsletters" : ""}, write a concise 3-5 paragraph morning narrative. This should read like a well-written morning newsletter — flowing prose, no bullet points, no section headers. Connect the dots between stories where relevant. Highlight what matters most and why.${vipNewsletterContext ? "\n\nIMPORTANT: The VIP newsletters below are from the reader's most trusted sources. Always feature their insights and analysis prominently — weave their key arguments into the narrative even if other stories seem bigger on the surface." : ""}

Keep it under ${vipNewsletterContext ? "500" : "400"} words. Write in a confident, informed tone — like a trusted analyst giving a morning rundown over coffee.

Today's articles:

${articleText}${vipSection}`,
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
