import { NextRequest } from "next/server";

/**
 * Simple in-memory rate limiter using a sliding window approach.
 * Tracks requests by IP address with configurable limits.
 *
 * Note: This is per-process. In a multi-instance deployment,
 * consider using Redis or a shared store instead.
 */

interface RequestRecord {
  timestamps: number[];
}

const requestMap = new Map<string, RequestRecord>();

// Clean up stale entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleEntries(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, record] of requestMap.entries()) {
    record.timestamps = record.timestamps.filter((t) => t > cutoff);
    if (record.timestamps.length === 0) {
      requestMap.delete(key);
    }
  }
}

function getClientIdentifier(request: NextRequest): string {
  // Try standard headers for proxied requests
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback identifier
  return "unknown";
}

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window. Default: 10 */
  maxRequests?: number;
  /** Time window in milliseconds. Default: 60000 (1 minute) */
  windowMs?: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

/**
 * Check whether a request should be rate-limited.
 *
 * Uses a sliding window: only timestamps within the last `windowMs`
 * milliseconds are counted. If the count meets or exceeds `maxRequests`,
 * the request is denied and `retryAfterMs` indicates how long until a
 * slot opens up.
 */
export function checkRateLimit(
  request: NextRequest,
  options?: RateLimitOptions
): RateLimitResult {
  const maxRequests = options?.maxRequests ?? 10;
  const windowMs = options?.windowMs ?? 60_000;

  // Periodic cleanup
  cleanupStaleEntries(windowMs);

  const identifier = getClientIdentifier(request);
  const now = Date.now();
  const cutoff = now - windowMs;

  let record = requestMap.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    requestMap.set(identifier, record);
  }

  // Remove timestamps outside the current window
  record.timestamps = record.timestamps.filter((t) => t > cutoff);

  if (record.timestamps.length >= maxRequests) {
    // Find the oldest timestamp in the window to calculate retry delay
    const oldestInWindow = record.timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;

    return {
      allowed: false,
      retryAfterMs: Math.max(retryAfterMs, 1),
    };
  }

  // Allow the request and record its timestamp
  record.timestamps.push(now);
  return { allowed: true };
}
