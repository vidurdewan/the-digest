"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import type { TopicCategory } from "@/types";

// ─── Topic Gradient Fallback (when article has no image) ─────────

const TOPIC_GRADIENTS: Record<TopicCategory, { light: string; dark: string }> = {
  "vc-startups":              { light: "from-indigo-100 to-blue-50",    dark: "from-indigo-950/60 to-blue-950/40" },
  "fundraising-acquisitions": { light: "from-emerald-100 to-green-50",  dark: "from-emerald-950/60 to-green-950/40" },
  "executive-movements":      { light: "from-violet-100 to-purple-50",  dark: "from-violet-950/60 to-purple-950/40" },
  "financial-markets":        { light: "from-amber-100 to-yellow-50",   dark: "from-amber-950/60 to-yellow-950/40" },
  "geopolitics":              { light: "from-red-100 to-rose-50",       dark: "from-red-950/60 to-rose-950/40" },
  "automotive":               { light: "from-slate-200 to-gray-100",    dark: "from-slate-900/60 to-gray-900/40" },
  "science-tech":             { light: "from-cyan-100 to-sky-50",       dark: "from-cyan-950/60 to-sky-950/40" },
  "local-news":               { light: "from-orange-100 to-amber-50",   dark: "from-orange-950/60 to-amber-950/40" },
  "politics":                 { light: "from-pink-100 to-rose-50",      dark: "from-pink-950/60 to-rose-950/40" },
};

interface TopicGradientProps {
  topic: TopicCategory;
  size?: "sm" | "md";
}

export function TopicGradient({ topic, size = "md" }: TopicGradientProps) {
  const gradients = TOPIC_GRADIENTS[topic] || { light: "from-gray-100 to-gray-50", dark: "from-gray-900/60 to-gray-800/40" };

  return (
    <div className="absolute inset-0">
      {/* Light mode gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradients.light} dark:hidden`} />
      {/* Dark mode gradient */}
      <div className={`absolute inset-0 hidden bg-gradient-to-br dark:block ${gradients.dark}`} />
      {/* Subtle dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
          backgroundSize: size === "sm" ? "14px 14px" : "20px 20px",
        }}
      />
    </div>
  );
}

// ─── Source Badge (favicon + name) ───────────────────────────────

interface SourceBadgeProps {
  source: string;
  sourceUrl?: string;
}

const SOURCE_COLOR_PALETTE = [
  "var(--source-color-0)", "var(--source-color-1)", "var(--source-color-2)", "var(--source-color-3)",
  "var(--source-color-4)", "var(--source-color-5)", "var(--source-color-6)", "var(--source-color-7)",
  "var(--source-color-8)", "var(--source-color-9)",
];

function getSourceColor(source: string): string {
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = source.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SOURCE_COLOR_PALETTE[Math.abs(hash) % SOURCE_COLOR_PALETTE.length];
}

function getFaviconUrl(sourceUrl?: string): string | null {
  if (!sourceUrl) return null;
  try {
    const hostname = new URL(sourceUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return null;
  }
}

export function SourceBadge({ source, sourceUrl }: SourceBadgeProps) {
  const [faviconError, setFaviconError] = useState(false);
  const faviconUrl = getFaviconUrl(sourceUrl);
  const showFavicon = faviconUrl && !faviconError;

  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-text-secondary">
      {showFavicon ? (
        <img
          src={faviconUrl}
          alt=""
          className="h-3.5 w-3.5 rounded-sm"
          onError={() => setFaviconError(true)}
          loading="lazy"
        />
      ) : (
        <span
          className="flex h-3.5 w-3.5 items-center justify-center rounded-sm text-[8px] font-bold text-white"
          style={{ backgroundColor: getSourceColor(source) }}
        >
          {source.charAt(0).toUpperCase()}
        </span>
      )}
      {source}
    </span>
  );
}
