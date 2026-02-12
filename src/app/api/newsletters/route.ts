import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase, isSupabaseAdminConfigured as isSupabaseConfigured } from "@/lib/supabase";

/**
 * GET /api/newsletters
 * Returns stored newsletters from the database.
 * Falls back to empty array if Supabase is not configured.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({ newsletters: [], source: "none" });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const { data, error } = await supabase
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
      source: "supabase",
      count: data?.length || 0,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch newsletters";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
