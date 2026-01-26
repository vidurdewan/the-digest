import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * POST /api/reminders
 * Create a reminder for an article.
 * Body: { articleId, remindAt, note? }
 */
export async function POST(request: NextRequest) {
  try {
    const { articleId, remindAt, note } = await request.json();

    if (!articleId || !remindAt) {
      return NextResponse.json(
        { error: "articleId and remindAt required" },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({ success: true, source: "local" });
    }

    const { data, error } = await supabase
      .from("reminders")
      .insert({
        article_id: articleId,
        remind_at: remindAt,
        note: note || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Reminder create error:", error);
      return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      reminder: {
        id: data.id,
        articleId: data.article_id,
        remindAt: data.remind_at,
        note: data.note,
        isDismissed: data.is_dismissed,
      },
    });
  } catch (error) {
    console.error("Reminder error:", error);
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
  }
}

/**
 * GET /api/reminders
 * Get reminders. Use ?due=true to get only due/overdue reminders.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({ reminders: [] });
    }

    const due = request.nextUrl.searchParams.get("due") === "true";

    let query = supabase
      .from("reminders")
      .select("*, articles(title, url)")
      .eq("is_dismissed", false)
      .order("remind_at", { ascending: true });

    if (due) {
      query = query.lte("remind_at", new Date().toISOString());
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ reminders: [] });
    }

    const reminders = (data || []).map((r: {
      id: string;
      article_id: string;
      remind_at: string;
      note: string | null;
      is_dismissed: boolean;
      articles: { title: string; url: string } | null;
    }) => ({
      id: r.id,
      articleId: r.article_id,
      remindAt: r.remind_at,
      note: r.note,
      isDismissed: r.is_dismissed,
      articleTitle: r.articles?.title || "Unknown article",
      articleUrl: r.articles?.url || "",
    }));

    return NextResponse.json({ reminders });
  } catch (error) {
    console.error("Get reminders error:", error);
    return NextResponse.json({ reminders: [] });
  }
}

/**
 * PATCH /api/reminders
 * Dismiss a reminder.
 * Body: { id }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({ success: true });
    }

    await supabase
      .from("reminders")
      .update({ is_dismissed: true })
      .eq("id", id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dismiss reminder error:", error);
    return NextResponse.json({ error: "Failed to dismiss" }, { status: 500 });
  }
}
