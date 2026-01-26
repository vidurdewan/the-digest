import { NextResponse } from "next/server";
import { clearTokens, buildClearTokenCookieHeader } from "@/lib/token-store";

/**
 * POST /api/auth/gmail/disconnect
 * Disconnects Gmail by clearing stored tokens.
 */
export async function POST() {
  try {
    await clearTokens();
    const response = NextResponse.json({ success: true });
    response.headers.append("Set-Cookie", buildClearTokenCookieHeader());
    return response;
  } catch {
    return NextResponse.json(
      { error: "Failed to disconnect Gmail" },
      { status: 500 }
    );
  }
}
