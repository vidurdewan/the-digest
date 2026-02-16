import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/gmail";
import * as crypto from "crypto";

const STATE_COOKIE = "gmail-oauth-state";

/**
 * GET /api/auth/gmail
 * Redirects the user to Google's OAuth consent screen.
 */
export async function GET() {
  try {
    const state = crypto.randomBytes(32).toString("hex");
    const url = getAuthUrl(state);

    const response = NextResponse.redirect(url);
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start OAuth flow";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
