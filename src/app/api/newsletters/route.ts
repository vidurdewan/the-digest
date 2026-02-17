import { NextRequest, NextResponse } from "next/server";
import {
  supabase,
  supabaseAdmin,
  isSupabaseConfigured,
  isSupabaseAdminConfigured,
} from "@/lib/supabase";

/**
 * GET /api/newsletters
 * Returns stored newsletters from the database.
 * Falls back to empty array if Supabase is not configured.
 */
export async function GET(request: NextRequest) {
  try {
    const db = supabaseAdmin || supabase;
    if (!db || (!isSupabaseAdminConfigured() && !isSupabaseConfigured())) {
      return NextResponse.json({ newsletters: [], source: "none" });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const { data, error } = await db
      .from("newsletters")
      .select("*")
      .order("received_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      newsletters: data || [],
      source: supabaseAdmin ? "supabase-admin" : "supabase-anon",
      count: data?.length || 0,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch newsletters";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
