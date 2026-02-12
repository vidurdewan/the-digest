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
 * POST /api/chat
 * AI chat interface. Accepts a message and article context.
 * Body: { message: string, articles: { title, source, brief }[], history?: { role, content }[] }
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
    const { message, articles, history } = body;

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    // Build context from articles
    const articleContext =
      articles && articles.length > 0
        ? articles
            .slice(0, 20)
            .map(
              (a: { title: string; source: string; brief: string; topic: string }, i: number) =>
                `[${i + 1}] "${a.title}" (${a.source}, topic: ${a.topic})${a.brief ? `\n   Summary: ${a.brief}` : ""}`
            )
            .join("\n\n")
        : "No articles available.";

    // Build conversation history
    const messages: { role: "user" | "assistant"; content: string }[] = [];
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        messages.push({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content,
        });
      }
    }
    messages.push({ role: "user", content: message });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are an AI assistant for "The Digest," a personal intelligence dashboard. You have access to the user's current news feed. Answer questions about the articles, provide analysis, identify trends, and make connections across stories.

Here are the current articles in the user's feed:

${articleContext}

Guidelines:
- Be concise and actionable
- Reference specific articles by title when relevant
- If asked about something not in the articles, say so honestly
- Use markdown formatting for readability`,
      messages,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({
      reply: text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
