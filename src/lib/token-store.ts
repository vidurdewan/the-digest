import { supabase, isSupabaseConfigured } from "./supabase";
import * as fs from "fs";
import * as path from "path";

interface StoredTokens {
  access_token: string | null;
  refresh_token: string | null;
  expiry_date: number | null;
  scope: string | null;
  token_type: string | null;
}

const LOCAL_TOKEN_PATH = path.join(process.cwd(), ".gmail-tokens.json");

/**
 * Store Gmail OAuth tokens.
 * Uses Supabase if configured, falls back to local file for development.
 */
export async function storeTokens(tokens: StoredTokens): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    // Upsert into a gmail_tokens table
    const { error } = await supabase.from("gmail_tokens").upsert(
      {
        id: "default",
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
      // Fall back to local file
      storeTokensLocally(tokens);
    }
  } else {
    storeTokensLocally(tokens);
  }
}

/**
 * Retrieve stored Gmail OAuth tokens.
 */
export async function getStoredTokens(): Promise<StoredTokens | null> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from("gmail_tokens")
      .select("*")
      .eq("id", "default")
      .single();

    if (data && !error) {
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expiry_date: data.expiry_date,
        scope: data.scope,
        token_type: data.token_type,
      };
    }
    // Fall through to local file
  }

  return getTokensLocally();
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
    await supabase.from("gmail_tokens").delete().eq("id", "default");
  }
  try {
    if (fs.existsSync(LOCAL_TOKEN_PATH)) {
      fs.unlinkSync(LOCAL_TOKEN_PATH);
    }
  } catch {
    // Ignore file deletion errors
  }
}

// ─── Local file helpers ─────────────────────────────────────

function storeTokensLocally(tokens: StoredTokens): void {
  try {
    fs.writeFileSync(LOCAL_TOKEN_PATH, JSON.stringify(tokens, null, 2));
  } catch (err) {
    console.error("Failed to store tokens locally:", err);
  }
}

function getTokensLocally(): StoredTokens | null {
  try {
    if (fs.existsSync(LOCAL_TOKEN_PATH)) {
      const data = fs.readFileSync(LOCAL_TOKEN_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}
