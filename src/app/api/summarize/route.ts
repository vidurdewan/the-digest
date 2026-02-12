import { NextRequest, NextResponse } from "next/server";
import { isClaudeConfigured } from "@/lib/claude";
import {
  summarizeFull,
  summarizeBrief,
  summarizeBatchBrief,
  getCachedSummary,
} from "@/lib/summarization";
import { checkBudget, getDailyUsage } from "@/lib/cost-tracker";
import { validateApiRequest } from "@/lib/api-auth";

/**
 * POST /api/summarize
 * Generate a summary for an article.
 *
 * Body:
 *   - articleId: string (required)
 *   - title: string (required)
 *   - content: string (article content)
 *   - source: string (source name)
 *   - tier: "brief" | "full" (default: "full")
 *
 * For batch brief summaries:
 *   - articles: Array<{id, title, content}> (batch mode)
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
          error: "Claude API not configured",
          hint: "Set ANTHROPIC_API_KEY in .env.local",
        },
        { status: 503 }
      );
    }

    // Check budget first
    const { allowed, usage } = await checkBudget();
    if (!allowed) {
      return NextResponse.json(
        {
          error: "Daily budget exceeded",
          usage,
        },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Batch mode
    if (body.articles && Array.isArray(body.articles)) {
      const result = await summarizeBatchBrief(body.articles);
      return NextResponse.json({
        mode: "batch-brief",
        ...result,
      });
    }

    // Single article mode
    const { articleId, title, content, source, tier } = body;

    if (!articleId || !title) {
      return NextResponse.json(
        { error: "articleId and title are required" },
        { status: 400 }
      );
    }

    if (tier === "brief") {
      const brief = await summarizeBrief(articleId, title, content || "");
      return NextResponse.json({
        mode: "brief",
        articleId,
        brief,
      });
    }

    // Default: full summary
    const summary = await summarizeFull(
      articleId,
      title,
      content || "",
      source || ""
    );

    if (!summary) {
      return NextResponse.json(
        { error: "Failed to generate summary" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      mode: "full",
      summary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Summarization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/summarize
 * Get summary for an article (from cache) or get usage status.
 *
 * Query params:
 *   - articleId: get cached summary for this article
 *   - status: if "true", return usage/cost info instead
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Usage status mode
    if (searchParams.get("status") === "true") {
      const usage = await getDailyUsage();
      return NextResponse.json({
        configured: isClaudeConfigured(),
        usage,
      });
    }

    // Get cached summary for an article
    const articleId = searchParams.get("articleId");
    if (!articleId) {
      return NextResponse.json(
        { error: "articleId query parameter required" },
        { status: 400 }
      );
    }

    const summary = await getCachedSummary(articleId);
    return NextResponse.json({
      articleId,
      summary,
      cached: !!summary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
