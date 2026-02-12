import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase, isSupabaseAdminConfigured as isSupabaseConfigured } from "@/lib/supabase";
import { validateApiRequest } from "@/lib/api-auth";

/**
 * GET /api/reading-progress?date=YYYY-MM-DD
 * Fetch reading progress for a specific date (defaults to today).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const date =
    params.get("date") || new Date().toISOString().slice(0, 10);

  try {
    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({
        progress: null,
        source: "none",
      });
    }

    const { data, error } = await supabase
      .from("reading_progress")
      .select("*")
      .eq("date", date)
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      progress: data
        ? {
            date: data.date,
            totalPriorityItems: data.total_priority_items,
            itemsRead: data.items_read,
          }
        : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch progress";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/reading-progress
 * Update reading progress for today.
 * Body: { totalPriorityItems: number, itemsRead: number }
 */
export async function POST(request: NextRequest) {
  const auth = validateApiRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({ success: false, source: "none" });
    }

    const body = await request.json();
    const date = new Date().toISOString().slice(0, 10);

    const { error } = await supabase.from("reading_progress").upsert(
      {
        date,
        total_priority_items: body.totalPriorityItems || 0,
        items_read: body.itemsRead || 0,
      },
      { onConflict: "date" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update progress";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
