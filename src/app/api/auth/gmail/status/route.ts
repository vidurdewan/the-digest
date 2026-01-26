import { NextResponse } from "next/server";
import { isGmailConnected } from "@/lib/token-store";

/**
 * GET /api/auth/gmail/status
 * Returns whether Gmail is connected.
 */
export async function GET() {
  try {
    const connected = await isGmailConnected();
    return NextResponse.json({ connected });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
