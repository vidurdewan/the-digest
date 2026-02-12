import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase, isSupabaseAdminConfigured as isSupabaseConfigured } from "@/lib/supabase";
import { validateApiRequest } from "@/lib/api-auth";

/**
 * GET /api/watchlist
 * Returns all watchlist items.
 */
export async function GET() {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({ items: [], source: "none" });
    }

    const { data, error } = await supabase
      .from("watchlist")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ items, source: "supabase" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch watchlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/watchlist
 * Add a watchlist item.
 * Body: { name: string, type: "company" | "fund" | "person" | "keyword" }
 */
export async function POST(request: NextRequest) {
  const auth = validateApiRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, type } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "name and type are required" },
        { status: 400 }
      );
    }

    if (!["company", "fund", "person", "keyword"].includes(type)) {
      return NextResponse.json(
        { error: "type must be company, fund, person, or keyword" },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured() || !supabase) {
      // Return a mock item for local dev
      return NextResponse.json({
        item: {
          id: `local-${Date.now()}`,
          name,
          type,
          createdAt: new Date().toISOString(),
        },
        source: "local",
      });
    }

    const { data, error } = await supabase
      .from("watchlist")
      .insert({ name, type })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      item: {
        id: data.id,
        name: data.name,
        type: data.type,
        createdAt: data.created_at,
      },
      source: "supabase",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add watchlist item";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/watchlist
 * Remove a watchlist item.
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  const auth = validateApiRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({ success: true, source: "local" });
    }

    const { error } = await supabase.from("watchlist").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, source: "supabase" });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to remove watchlist item";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
