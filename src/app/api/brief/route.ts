import { NextRequest, NextResponse } from "next/server";
import { isClaudeConfigured } from "@/lib/claude";
import Anthropic from "@anthropic-ai/sdk";
import { validateApiRequest } from "@/lib/api-auth";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client = new Anthropic({ apiKey });
  return client;
}

/**
 * POST /api/brief
 * "Brief Me" mode — generates a curated daily briefing from articles.
 * Body: { articles: { title, source, brief, topic, publishedAt }[], focus?: string }
 */
export async function POST(request: NextRequest) {
  const auth = validateApiRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    if (!isClaudeConfigured()) {
      return NextResponse.json(
        {
          error:
            "Claude API is not configured. Set ANTHROPIC_API_KEY in .env.local.",
        },
        { status: 503 }
      );
    }

    const anthropic = getClient();
    if (!anthropic) {
      return NextResponse.json(
        { error: "Failed to initialize Claude client" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { articles, focus } = body;

    if (!articles || articles.length === 0) {
      return NextResponse.json(
        { error: "articles are required" },
        { status: 400 }
      );
    }

    // Build article context
    const articleText = articles
      .slice(0, 25)
      .map(
        (a: { title: string; source: string; brief: string; topic: string }, i: number) =>
          `[${i + 1}] "${a.title}" (${a.source}, topic: ${a.topic})${a.brief ? `\n   ${a.brief}` : ""}`
      )
      .join("\n\n");

    const focusInstruction = focus
      ? `\n\nThe user has requested a focus on: "${focus}". Emphasize articles and trends related to this focus area.`
      : "";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `Generate a concise executive briefing based on today's articles.${focusInstruction}

Articles:

${articleText}

Format the briefing in markdown with these sections:
## 🎯 Top Stories
(2-3 most important stories with 1-sentence each)

## 💰 Deals & Fundraising
(Notable deals, acquisitions — skip if none)

## 👤 People Moves
(Executive changes, notable hires — skip if none)

## 📈 Market Signals
(Key trends and what they mean)

## 🔮 What to Watch
(2-3 things to keep an eye on this week)

Keep each section to 2-4 bullet points max. Be concise and actionable. Skip any section that has no relevant articles.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({
      briefing: text,
      articleCount: Math.min(articles.length, 25),
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Briefing generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
