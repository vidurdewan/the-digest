import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCode } from "@/lib/gmail";
import { storeTokens } from "@/lib/token-store";

/**
 * GET /api/auth/gmail/callback
 * Handles the OAuth callback from Google.
 * Exchanges the code for tokens and stores them.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Handle user denial
  if (error) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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

    // Store tokens
    await storeTokens({
      access_token: tokens.access_token || null,
      refresh_token: tokens.refresh_token || null,
      expiry_date: tokens.expiry_date || null,
      scope: tokens.scope || null,
      token_type: tokens.token_type || null,
    });

    // Redirect back to the app with success
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}?gmail_connected=true`);
  } catch (err) {
    console.error("Gmail OAuth callback error:", err);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${appUrl}?gmail_error=${encodeURIComponent("Failed to connect Gmail")}`
    );
  }
}
