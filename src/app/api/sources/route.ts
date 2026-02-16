import { NextRequest, NextResponse } from "next/server";
import { defaultSources, type NewsSource } from "@/lib/sources";
import { supabaseAdmin as supabase, isSupabaseAdminConfigured as isSupabaseConfigured } from "@/lib/supabase";
import { validateApiRequest } from "@/lib/api-auth";

/**
 * GET /api/sources
 * Returns all configured news sources.
 * Uses Supabase if configured, falls back to default sources.
 */
export async function GET() {
  try {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from("sources")
        .select("*")
        .order("name");

      if (data && !error && data.length > 0) {
        return NextResponse.json({ sources: data, origin: "supabase" });
      }
    }

    // Fall back to default sources
    return NextResponse.json({ sources: defaultSources, origin: "default" });
  } catch {
    return NextResponse.json({ sources: defaultSources, origin: "default" });
  }
}

/**
 * POST /api/sources
 * Add a new source.
 */
export async function POST(request: NextRequest) {
  const auth = validateApiRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, url, type, topic } = body as Partial<NewsSource>;

    if (!name || !url || !type || !topic) {
      return NextResponse.json(
        { error: "Missing required fields: name, url, type, topic" },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from("sources")
        .insert({
          name,
          url,
          type,
          topic,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ source: data });
    }

    return NextResponse.json(
      { error: "Supabase not configured. Sources are read-only." },
      { status: 503 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add source";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/sources
 * Remove a source by ID.
 */
export async function DELETE(request: NextRequest) {
  const auth = validateApiRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Missing source ID" },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from("sources").delete().eq("id", id);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Supabase not configured. Sources are read-only." },
      { status: 503 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete source";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
