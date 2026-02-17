import { NextRequest, NextResponse } from "next/server";
import {
  acknowledgeSinceLastRead,
  getSinceLastRead,
} from "@/lib/continuity-engine";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateApiRequest } from "@/lib/api-auth";

const CLIENT_ID_COOKIE = "the_digest_client_id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function resolveClientId(request: NextRequest): string {
  const headerId = request.headers.get("x-digest-client-id")?.trim();
  if (headerId) return headerId;

  const cookieId = request.cookies.get(CLIENT_ID_COOKIE)?.value?.trim();
  if (cookieId) return cookieId;

  return "anonymous";
}

function attachClientCookie(response: NextResponse, clientId: string): void {
  response.cookies.set({
    name: CLIENT_ID_COOKIE,
    value: clientId,
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
  });
}

/**
 * GET /api/since-last-read?depth=2m|10m|deep
 * Returns continuity snapshot for the current client.
 */
export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit(request, { maxRequests: 20, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests", retryAfterMs: rateLimit.retryAfterMs },
      { status: 429 }
    );
  }

  try {
    const depth = request.nextUrl.searchParams.get("depth");
    const clientId = resolveClientId(request);

    const payload = await getSinceLastRead({ clientId, depth });

    const response = NextResponse.json(payload);
    attachClientCookie(response, payload.state.clientId);
    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch since-last-read snapshot";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/since-last-read
 * Marks continuity checkpoint as read.
 * Body: { depth?: "2m" | "10m" | "deep", untilAt?: string }
 */
export async function POST(request: NextRequest) {
  const auth = validateApiRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const rateLimit = checkRateLimit(request, { maxRequests: 20, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests", retryAfterMs: rateLimit.retryAfterMs },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const depth = typeof body.depth === "string" ? body.depth : null;
    const untilAt = typeof body.untilAt === "string" ? body.untilAt : null;

    const clientId = resolveClientId(request);
    const state = await acknowledgeSinceLastRead({ clientId, depth, untilAt });

    const response = NextResponse.json({ success: true, state });
    attachClientCookie(response, state.clientId);
    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update since-last-read checkpoint";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
