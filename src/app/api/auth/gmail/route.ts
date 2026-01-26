import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/gmail";

/**
 * GET /api/auth/gmail
 * Redirects the user to Google's OAuth consent screen.
 */
export async function GET() {
  try {
    const url = getAuthUrl();
    return NextResponse.redirect(url);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start OAuth flow";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
