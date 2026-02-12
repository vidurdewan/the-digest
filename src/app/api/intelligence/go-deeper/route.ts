import { NextRequest, NextResponse } from "next/server";
import { isClaudeConfigured } from "@/lib/claude";
import { checkBudget, recordUsage } from "@/lib/cost-tracker";
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
 * POST /api/intelligence/go-deeper
 * Generate extended analysis for an article (on-click only).
 * Body: { articleId, title, content }
 */
export async function POST(request: NextRequest) {
  const auth = validateApiRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
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

    const { title, content } = await request.json();
    if (!title) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }

    const anthropic = getClient();
    if (!anthropic) {
      return NextResponse.json({ error: "AI not available" }, { status: 503 });
    }

    const truncated = (content || title).slice(0, 8000);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: `You are an intelligence analyst providing deep analysis for a senior professional. Given this article, provide a thorough analysis covering:

1. **Second-order implications**: What are the non-obvious consequences?
2. **Historical context**: How does this fit into broader patterns over the past year?
3. **Stakeholder impact**: Who wins, who loses, who should be watching?
4. **Related developments**: What other recent events connect to this?
5. **Risk assessment**: What could go wrong or accelerate?

Title: ${title}

Content:
${truncated}

Write a clear, analytical response in 4-6 paragraphs. No JSON formatting — just clear prose. Be specific, cite names and companies. Write for someone who is well-informed but wants deeper insight.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    await recordUsage(response.usage.input_tokens, response.usage.output_tokens);

    return NextResponse.json({ analysis: text.trim() });
  } catch (error) {
    console.error("Go deeper error:", error);
    return NextResponse.json(
      { error: "Failed to generate analysis" },
      { status: 500 }
    );
  }
}
