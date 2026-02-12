import { NextRequest } from "next/server";

let devWarningLogged = false;

/**
 * Validates an incoming API request using a shared secret.
 *
 * - If `API_SECRET` env var is set, requires `Authorization: Bearer <token>` header.
 * - If `API_SECRET` is NOT set (dev mode), allows all requests but logs a warning once.
 *
 * @returns `{ authorized: true }` on success, `{ authorized: false, error: string }` on failure.
 */
export function validateApiRequest(
  request: NextRequest
): { authorized: true } | { authorized: false; error: string } {
  const apiSecret = process.env.API_SECRET;

  // Dev mode: no secret configured — allow all requests with a one-time warning
  if (!apiSecret) {
    if (!devWarningLogged) {
      console.warn(
        "[api-auth] WARNING: API_SECRET is not set. All API requests are allowed without authentication. " +
          "Set API_SECRET in your environment variables to enable auth."
      );
      devWarningLogged = true;
    }
    return { authorized: true };
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return { authorized: false, error: "Missing Authorization header" };
  }

  // Expect "Bearer <token>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return {
      authorized: false,
      error: "Invalid Authorization header format. Expected: Bearer <token>",
    };
  }

  const token = parts[1];
  if (token !== apiSecret) {
    return { authorized: false, error: "Invalid API token" };
  }

  return { authorized: true };
}
