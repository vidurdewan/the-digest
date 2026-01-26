import { NextRequest, NextResponse } from "next/server";
import { generateDailyDigest, isClaudeConfigured } from "@/lib/claude";

/**
 * POST /api/digest
 * Generates a consolidated daily digest from newsletters.
 * Body: { newsletters: Array<{ publication, subject, content }> }
 */
export async function POST(request: NextRequest) {
  try {
    if (!isClaudeConfigured()) {
      return NextResponse.json(
        {
          error:
            "Claude API not configured. Set ANTHROPIC_API_KEY in environment variables.",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const newsletters = body.newsletters;

    if (!newsletters || !Array.isArray(newsletters) || newsletters.length === 0) {
      return NextResponse.json(
        { error: "No newsletters provided" },
        { status: 400 }
      );
    }

    const result = await generateDailyDigest(newsletters);

    if (!result) {
      return NextResponse.json(
        { error: "Failed to generate digest" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      digest: result.digest,
      newsletterCount: newsletters.length,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    });
  } catch (error) {
    console.error("Digest generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate digest";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
