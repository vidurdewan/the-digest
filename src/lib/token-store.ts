import { supabase, isSupabaseConfigured } from "./supabase";
import { cookies } from "next/headers";
import * as crypto from "crypto";

interface StoredTokens {
  access_token: string | null;
  refresh_token: string | null;
  expiry_date: number | null;
  scope: string | null;
  token_type: string | null;
}

const COOKIE_NAME = "gmail-tokens";
const TOKEN_ROW_ID: string = "default-user";
const LEGACY_TOKEN_ROW_ID: string = "default";

// Derive a 32-byte key from the Google client secret
function getEncryptionKey(): Buffer {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) {
    throw new Error("GOOGLE_CLIENT_SECRET must be set for token encryption");
  }
  return crypto.scryptSync(secret, "the-digest-salt", 32);
}

function encrypt(data: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(data, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // iv (12) + tag (16) + encrypted data
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decrypt(encoded: string): string {
  const key = getEncryptionKey();
  const buf = Buffer.from(encoded, "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

/**
 * Store Gmail OAuth tokens.
 * Uses Supabase if configured, otherwise stores in an encrypted cookie.
 */
export async function storeTokens(tokens: StoredTokens): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from("gmail_tokens").upsert(
      {
        id: TOKEN_ROW_ID,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        scope: tokens.scope,
        token_type: tokens.token_type,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (error) {
      console.error("Failed to store tokens in Supabase:", error.message);
    }

    // Clean up legacy token row once we've successfully written the canonical row.
    if (!error && TOKEN_ROW_ID !== LEGACY_TOKEN_ROW_ID) {
      await supabase
        .from("gmail_tokens")
        .delete()
        .eq("id", LEGACY_TOKEN_ROW_ID);
    }
  }

  // Always store in cookie as well for serverless environments
  try {
    const cookieStore = await cookies();
    const encrypted = encrypt(JSON.stringify(tokens));
    cookieStore.set(COOKIE_NAME, encrypted, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  } catch (e) {
    // cookies() may not be available, or encryption may fail if
    // GOOGLE_CLIENT_SECRET is not set
    if (e instanceof Error && e.message.includes("GOOGLE_CLIENT_SECRET")) {
      console.warn("Skipping cookie token storage: GOOGLE_CLIENT_SECRET is not configured");
    }
  }
}

/**
 * Build a Set-Cookie header value for the token cookie.
 * Used in redirect responses where cookies() API isn't available.
 */
export function buildTokenCookieHeader(tokens: StoredTokens): string {
  const encrypted = encrypt(JSON.stringify(tokens));
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encrypted}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 365}${secure}`;
}

/**
 * Build a Set-Cookie header value that clears the token cookie.
 */
export function buildClearTokenCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0`;
}

/**
 * Retrieve stored Gmail OAuth tokens.
 */
export async function getStoredTokens(): Promise<StoredTokens | null> {
  // Try Supabase first
  if (isSupabaseConfigured() && supabase) {
    const supabaseClient = supabase;

    const loadById = async (id: string): Promise<StoredTokens | null> => {
      const { data, error } = await supabaseClient
        .from("gmail_tokens")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!data || error) return null;
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expiry_date: data.expiry_date,
        scope: data.scope,
        token_type: data.token_type,
      };
    };

    const canonical = await loadById(TOKEN_ROW_ID);
    if (canonical) {
      return canonical;
    }

    // Backward-compatibility for legacy rows created before TOKEN_ROW_ID changed.
    if (TOKEN_ROW_ID !== LEGACY_TOKEN_ROW_ID) {
      const legacy = await loadById(LEGACY_TOKEN_ROW_ID);
      if (legacy) {
        await supabaseClient.from("gmail_tokens").upsert(
          {
            id: TOKEN_ROW_ID,
            access_token: legacy.access_token,
            refresh_token: legacy.refresh_token,
            expiry_date: legacy.expiry_date,
            scope: legacy.scope,
            token_type: legacy.token_type,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
        return legacy;
      }
    }
  }

  // Try cookie
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);
    if (cookie?.value) {
      return JSON.parse(decrypt(cookie.value));
    }
  } catch (e) {
    // Cookie not available, decryption failed, or GOOGLE_CLIENT_SECRET not set
    if (e instanceof Error && e.message.includes("GOOGLE_CLIENT_SECRET")) {
      console.warn("Skipping cookie token retrieval: GOOGLE_CLIENT_SECRET is not configured");
    }
  }

  return null;
}

/**
 * Check if Gmail is connected (tokens exist).
 */
export async function isGmailConnected(): Promise<boolean> {
  const tokens = await getStoredTokens();
  return tokens !== null && tokens.refresh_token !== null;
}

/**
 * Clear stored tokens (disconnect Gmail).
 */
export async function clearTokens(): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    const ids = Array.from(new Set([TOKEN_ROW_ID, LEGACY_TOKEN_ROW_ID]));
    await supabase.from("gmail_tokens").delete().in("id", ids);
  }

  // Clear cookie
  try {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
  } catch {
    // cookies() may not be available
  }
}
