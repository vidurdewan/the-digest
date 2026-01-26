import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCode } from "@/lib/gmail";
import { storeTokens, buildTokenCookieHeader } from "@/lib/token-store";

/**
 * GET /api/auth/gmail/callback
 * Handles the OAuth callback from Google.
 * Exchanges the code for tokens and stores them.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const appUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  // Handle user denial
  if (error) {
    return NextResponse.redirect(
      `${appUrl}?gmail_error=${encodeURIComponent(error)}`
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
    return response;
  } catch (err) {
    console.error("Gmail OAuth callback error:", err);
    return NextResponse.redirect(
      `${appUrl}?gmail_error=${encodeURIComponent("Failed to connect Gmail")}`
    );
  }
}
