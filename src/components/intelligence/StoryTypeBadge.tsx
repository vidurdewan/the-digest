"use client";

import type { StoryType } from "@/types";

const LABELS: Record<StoryType, string> = {
  breaking: "Breaking",
  developing: "Developing",
  analysis: "Analysis",
  opinion: "Opinion",
  feature: "Feature",
  update: "Update",
};

export function StoryTypeBadge({ type }: { type: StoryType }) {
  const label = LABELS[type] || LABELS.update;
  return (
    <span className="pill-outlined">
      {label}
    </span>
  );
}
