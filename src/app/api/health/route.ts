import { NextResponse } from "next/server";
import { supabaseAdmin as supabase, isSupabaseAdminConfigured as isSupabaseConfigured } from "@/lib/supabase";

export async function GET() {
  const checks: Record<string, string> = {
    app: "ok",
    supabase: "not configured",
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.from("users").select("id").limit(1);
      checks.supabase = error ? `error: ${error.message}` : "connected";
    } catch {
      checks.supabase = "connection failed";
    }
  }

  return NextResponse.json({
    status: "running",
    timestamp: new Date().toISOString(),
    checks,
  });
}
