import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase, isSupabaseAdminConfigured as isSupabaseConfigured } from "@/lib/supabase";
import { validateApiRequest } from "@/lib/api-auth";

const VALID_REACTIONS = [
  "already_knew",
  "useful",
  "surprising",
  "bad_connection",
  "not_important",
];

/**
 * POST /api/reactions
 * Toggle a reaction on an article.
 * Body: { articleId: string, reaction: string }
 */
export async function POST(request: NextRequest) {
  const auth = validateApiRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { articleId, reaction } = await request.json();

    if (!articleId || !reaction) {
      return NextResponse.json(
        { error: "articleId and reaction required" },
        { status: 400 }
      );
    }

    if (!VALID_REACTIONS.includes(reaction)) {
      return NextResponse.json(
        { error: `Invalid reaction. Must be one of: ${VALID_REACTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({ success: true, source: "local" });
    }

    // Check if reaction exists — toggle
    const { data: existing } = await supabase
      .from("article_reactions")
      .select("id")
      .eq("article_id", articleId)
      .eq("reaction", reaction)
      .single();

    if (existing) {
      // Remove existing reaction
      await supabase
        .from("article_reactions")
        .delete()
        .eq("id", existing.id);

      return NextResponse.json({ success: true, action: "removed" });
    } else {
      // Add new reaction
      await supabase.from("article_reactions").insert({
        article_id: articleId,
        reaction,
      });

      return NextResponse.json({ success: true, action: "added" });
    }
  } catch (error) {
    console.error("Reaction error:", error);
    return NextResponse.json(
      { error: "Failed to process reaction" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reactions
 * Get reactions for article(s).
 * Query: ?articleId=xxx or ?articleIds=xxx,yyy,zzz
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const articleId = searchParams.get("articleId");
    const articleIds = searchParams.get("articleIds");

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({ reactions: {} });
    }

    let query = supabase.from("article_reactions").select("article_id, reaction");

    if (articleId) {
      query = query.eq("article_id", articleId);
    } else if (articleIds) {
      const ids = articleIds.split(",");
      query = query.in("article_id", ids);
    } else {
      return NextResponse.json({ reactions: {} });
    }

    const { data } = await query;

    // Group by article ID
    const reactions: Record<string, string[]> = {};
    if (data) {
      for (const row of data) {
        if (!reactions[row.article_id]) {
          reactions[row.article_id] = [];
        }
        reactions[row.article_id].push(row.reaction);
      }
    }

    return NextResponse.json({ reactions });
  } catch (error) {
    console.error("Get reactions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reactions" },
      { status: 500 }
    );
  }
}
