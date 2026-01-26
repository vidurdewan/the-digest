import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * GET /api/annotations?articleId=...
 * Returns annotations for an article, or all annotations if no articleId.
 */
export async function GET(request: NextRequest) {
  const articleId = request.nextUrl.searchParams.get("articleId");
  const search = request.nextUrl.searchParams.get("q");

  try {
    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({ annotations: [], source: "none" });
    }

    let query = supabase
      .from("annotations")
      .select("*")
      .order("created_at", { ascending: false });

    if (articleId) {
      query = query.eq("article_id", articleId);
    }

    if (search) {
      query = query.ilike("note", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const annotations = (data || []).map((row) => ({
      id: row.id,
      articleId: row.article_id,
      note: row.note,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ annotations, source: "supabase" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch annotations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/annotations
 * Add or update an annotation.
 * Body: { articleId: string, note: string, id?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleId, note, id } = body;

    if (!articleId || !note) {
      return NextResponse.json(
        { error: "articleId and note are required" },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({
        annotation: {
          id: id || `local-${Date.now()}`,
          articleId,
          note,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        source: "local",
      });
    }

    if (id) {
      // Update existing
      const { data, error } = await supabase
        .from("annotations")
        .update({ note, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        annotation: {
          id: data.id,
          articleId: data.article_id,
          note: data.note,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
        source: "supabase",
      });
    } else {
      // Create new
      const { data, error } = await supabase
        .from("annotations")
        .insert({ article_id: articleId, note })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        annotation: {
          id: data.id,
          articleId: data.article_id,
          note: data.note,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
        source: "supabase",
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save annotation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/annotations
 * Remove an annotation.
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({ success: true, source: "local" });
    }

    const { error } = await supabase.from("annotations").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, source: "supabase" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete annotation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
