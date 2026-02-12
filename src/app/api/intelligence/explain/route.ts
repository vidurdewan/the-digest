import { NextRequest, NextResponse } from "next/server";
import { isClaudeConfigured } from "@/lib/claude";
import { checkBudget, recordUsage } from "@/lib/cost-tracker";
import Anthropic from "@anthropic-ai/sdk";
import { validateApiRequest } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client = new Anthropic({ apiKey });
  return client;
}

/**
 * POST /api/intelligence/explain
 * Generate a simplified explanation of an article (on-click only).
 * Body: { articleId, title, content }
 */
export async function POST(request: NextRequest) {
  const auth = validateApiRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const rateLimit = checkRateLimit(request);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests", retryAfterMs: rateLimit.retryAfterMs },
      { status: 429 }
    );
  }

  try {
    if (!isClaudeConfigured()) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const { allowed } = await checkBudget();
    if (!allowed) {
      return NextResponse.json(
        { error: "Daily API budget exceeded" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { title, content } = body;

    // Input validation
    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "title is required and must be a string" },
        { status: 400 }
      );
    }
    if (content !== undefined && typeof content !== "string") {
      return NextResponse.json(
        { error: "content must be a string" },
        { status: 400 }
      );
    }
    if (title.length > 100_000) {
      return NextResponse.json(
        { error: "title exceeds maximum of 100,000 characters" },
        { status: 400 }
      );
    }
    if (typeof content === "string" && content.length > 100_000) {
      return NextResponse.json(
        { error: "content exceeds maximum of 100,000 characters" },
        { status: 400 }
      );
    }

    const anthropic = getClient();
    if (!anthropic) {
      return NextResponse.json({ error: "AI not available" }, { status: 503 });
    }

    const truncated = (content || title).slice(0, 4000);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Explain this article in simple, accessible language. Assume the reader is smart but unfamiliar with the specific domain. Avoid jargon, define any necessary technical terms, and explain why this matters in everyday terms.

Title: ${title}

Content:
${truncated}

Write 2-3 clear paragraphs. Use analogies if helpful. Focus on: What happened, why it matters to regular people, and what might happen next.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    await recordUsage(response.usage.input_tokens, response.usage.output_tokens);

    return NextResponse.json({ explanation: text.trim() });
  } catch (error) {
    console.error("Explain error:", error);
    return NextResponse.json(
      { error: "Failed to generate explanation" },
      { status: 500 }
    );
  }
}
