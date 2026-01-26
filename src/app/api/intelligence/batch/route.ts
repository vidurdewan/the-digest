import { NextRequest, NextResponse } from "next/server";
import { processIntelligenceBatch } from "@/lib/intelligence";
import { isClaudeConfigured } from "@/lib/claude";

/**
 * POST /api/intelligence/batch
 * Batch-process intelligence data for articles.
 * Body: { articles: [{ id, title, content, source, topic, entityNames? }] }
 */
export async function POST(request: NextRequest) {
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
