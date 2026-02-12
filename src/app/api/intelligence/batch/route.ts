import { NextRequest, NextResponse } from "next/server";
import { processIntelligenceBatch } from "@/lib/intelligence";
import { isClaudeConfigured } from "@/lib/claude";
import { validateApiRequest } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/intelligence/batch
 * Batch-process intelligence data for articles.
 * Body: { articles: [{ id, title, content, source, topic, entityNames? }] }
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
      return NextResponse.json(
        { error: "Claude API not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const articles = body.articles;

    if (!Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json(
        { error: "articles array required" },
        { status: 400 }
      );
    }

    // Input validation
    if (articles.length > 50) {
      return NextResponse.json(
        { error: "articles array exceeds maximum of 50 items" },
        { status: 400 }
      );
    }

    // Silently truncate oversized content fields
    for (const article of articles) {
      if (article.content && typeof article.content === "string" && article.content.length > 100_000) {
        article.content = article.content.slice(0, 100_000);
      }
    }

    const result = await processIntelligenceBatch(articles);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Intelligence batch error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to process intelligence batch";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
