import { NextResponse } from "next/server";
import { clearTokens } from "@/lib/token-store";

/**
 * POST /api/auth/gmail/disconnect
 * Disconnects Gmail by clearing stored tokens.
 */
export async function POST() {
  try {
    await clearTokens();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to disconnect Gmail" },
      { status: 500 }
    );
  }
}
