"use client";

import type { StoryType } from "@/types";

const STYLES: Record<StoryType, { bg: string; text: string; label: string }> = {
  breaking: { bg: "bg-red-100", text: "text-red-700", label: "Breaking" },
  developing: { bg: "bg-orange-100", text: "text-orange-700", label: "Developing" },
  analysis: { bg: "bg-blue-100", text: "text-blue-700", label: "Analysis" },
  opinion: { bg: "bg-purple-100", text: "text-purple-700", label: "Opinion" },
  feature: { bg: "bg-green-100", text: "text-green-700", label: "Feature" },
  update: { bg: "bg-gray-100", text: "text-gray-600", label: "Update" },
};

export function StoryTypeBadge({ type }: { type: StoryType }) {
  const style = STYLES[type] || STYLES.update;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}
