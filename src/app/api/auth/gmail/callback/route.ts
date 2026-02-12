import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCode } from "@/lib/gmail";
import { storeTokens, buildTokenCookieHeader } from "@/lib/token-store";

const STATE_COOKIE = "gmail-oauth-state";

/**
 * GET /api/auth/gmail/callback
 * Handles the OAuth callback from Google.
 * Exchanges the code for tokens and stores them.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  const appUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  // Handle user denial
  if (error) {
    return NextResponse.redirect(
      `${appUrl}?gmail_error=${encodeURIComponent(error)}`
    );
  }

  // Validate CSRF state parameter
  const storedState = request.cookies.get(STATE_COOKIE)?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      `${appUrl}?gmail_error=${encodeURIComponent("Invalid OAuth state. Please try connecting again.")}`
    );
  }

  // No code provided
  if (!code) {
    return NextResponse.json(
      { error: "No authorization code received" },
      { status: 400 }
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    const storedTokens = {
      access_token: tokens.access_token || null,
      refresh_token: tokens.refresh_token || null,
      expiry_date: tokens.expiry_date || null,
      scope: tokens.scope || null,
      token_type: tokens.token_type || null,
    };

    // Store tokens (Supabase if available)
    await storeTokens(storedTokens);

    // Redirect back to the app with success, setting token cookie on the response
    const response = NextResponse.redirect(`${appUrl}?gmail_connected=true`);
    response.headers.append("Set-Cookie", buildTokenCookieHeader(storedTokens));

    // Clear the state cookie
    response.cookies.set(STATE_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error("Gmail OAuth callback error:", err);
    return NextResponse.redirect(
      `${appUrl}?gmail_error=${encodeURIComponent("Failed to connect Gmail")}`
    );
  }
}
