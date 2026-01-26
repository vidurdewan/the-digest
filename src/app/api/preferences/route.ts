import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { TopicCategory, InterestLevel } from "@/types";

type TopicPreferences = Record<TopicCategory, InterestLevel>;

const defaultPreferences: TopicPreferences = {
  "vc-startups": "high",
  "fundraising-acquisitions": "high",
  "executive-movements": "high",
  "financial-markets": "medium",
  geopolitics: "medium",
  automotive: "medium",
  "science-tech": "medium",
  "local-news": "low",
  politics: "medium",
};

/**
 * GET /api/preferences
 * Returns topic preferences.
 */
export async function GET() {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({
        preferences: defaultPreferences,
        source: "default",
      });
    }

    const { data } = await supabase
      .from("settings")
      .select("topic_preferences")
      .limit(1)
      .single();

    if (data?.topic_preferences && Object.keys(data.topic_preferences).length > 0) {
      return NextResponse.json({
        preferences: { ...defaultPreferences, ...data.topic_preferences },
        source: "supabase",
      });
    }

    return NextResponse.json({
      preferences: defaultPreferences,
      source: "default",
    });
  } catch {
    return NextResponse.json({
      preferences: defaultPreferences,
      source: "default",
    });
  }
}

/**
 * POST /api/preferences
 * Update topic preferences.
 * Body: { preferences: Record<TopicCategory, InterestLevel> }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { preferences } = body;

    if (!preferences) {
      return NextResponse.json(
        { error: "preferences object is required" },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({
        preferences,
        source: "local",
      });
    }

    // Upsert settings
    const { error } = await supabase.from("settings").upsert(
      {
        id: "00000000-0000-0000-0000-000000000001",
        topic_preferences: preferences,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ preferences, source: "supabase" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
