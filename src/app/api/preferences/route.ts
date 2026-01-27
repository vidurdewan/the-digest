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

const defaultVipNewsletters: string[] = ["Stratechery"];

/**
 * GET /api/preferences
 * Returns topic preferences and VIP newsletters.
 */
export async function GET() {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({
        preferences: defaultPreferences,
        vipNewsletters: defaultVipNewsletters,
        source: "default",
      });
    }

    const { data } = await supabase
      .from("settings")
      .select("topic_preferences, vip_newsletters")
      .limit(1)
      .single();

    const preferences =
      data?.topic_preferences && Object.keys(data.topic_preferences).length > 0
        ? { ...defaultPreferences, ...data.topic_preferences }
        : defaultPreferences;

    const vipNewsletters =
      data?.vip_newsletters && Array.isArray(data.vip_newsletters)
        ? data.vip_newsletters
        : defaultVipNewsletters;

    return NextResponse.json({
      preferences,
      vipNewsletters,
      source: "supabase",
    });
  } catch {
    return NextResponse.json({
      preferences: defaultPreferences,
      vipNewsletters: defaultVipNewsletters,
      source: "default",
    });
  }
}

/**
 * POST /api/preferences
 * Update topic preferences and/or VIP newsletters.
 * Body: { preferences?: Record<TopicCategory, InterestLevel>, vipNewsletters?: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { preferences, vipNewsletters } = body;

    if (!preferences && !vipNewsletters) {
      return NextResponse.json(
        { error: "preferences or vipNewsletters is required" },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({
        preferences: preferences || defaultPreferences,
        vipNewsletters: vipNewsletters || defaultVipNewsletters,
        source: "local",
      });
    }

    // Build the upsert payload — only include fields that were provided
    const upsertData: Record<string, unknown> = {
      id: "00000000-0000-0000-0000-000000000001",
      updated_at: new Date().toISOString(),
    };
    if (preferences) {
      upsertData.topic_preferences = preferences;
    }
    if (vipNewsletters) {
      upsertData.vip_newsletters = vipNewsletters;
    }

    const { error } = await supabase
      .from("settings")
      .upsert(upsertData, { onConflict: "id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      preferences: preferences || defaultPreferences,
      vipNewsletters: vipNewsletters || defaultVipNewsletters,
      source: "supabase",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
