"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  Eye,
  Globe,
  Lightbulb,
  Newspaper,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";

// ─── Shared Icons for Section Headers ─────────────────────
// Map section labels to icon identifiers for consistent styling.
const SECTION_ICONS: Record<string, { Icon: LucideIcon; color: string }> = {
  "The News": { Icon: Newspaper, color: "var(--accent-primary)" },
  "Why It Matters": { Icon: Lightbulb, color: "var(--accent-warning)" },
  "The Context": { Icon: Globe, color: "var(--accent-success)" },
  "So What": { Icon: Zap, color: "var(--accent-primary)" },
  "Watch Next": { Icon: Eye, color: "var(--text-tertiary)" },
  "Contrarian Take": { Icon: AlertTriangle, color: "var(--accent-warning)" },
  "Top Stories": { Icon: Newspaper, color: "var(--accent-primary)" },
  "Trends & Signals": { Icon: BarChart3, color: "var(--accent-primary)" },
  "Market & Deal Activity": { Icon: TrendingUp, color: "var(--accent-success)" },
  "People Moves": { Icon: User, color: "var(--text-secondary)" },
};

// Sections that should use elevated callout styling
const CALLOUT_SECTIONS = new Set([
  "So What",
  "Contrarian Take",
  "Bottom Line",
]);

// Sections that should use dashed-border subtle callout
const SUBTLE_CALLOUT_SECTIONS = new Set([
  "Watch Next",
]);

type SectionTier = "primary" | "secondary" | "tertiary";

function getSectionTier(label: string): SectionTier {
  if (label === "The News") return "primary";
  if (["Why It Matters", "The Context", "Top Stories", "Trends & Signals", "Market & Deal Activity", "People Moves"].includes(label)) return "secondary";
  return "tertiary";
}

// ─── Inline Citation Renderer ─────────────────────────────
// Detects [Source Name] patterns and renders them as clickable chips.
function renderWithCitations(text: string, sourceUrls?: Record<string, string>): React.ReactNode {
  // Split on [Source Name] patterns — but not [1], [2] numeric refs
  const parts = text.split(/(\[[^\]]+\])/g);
  if (parts.length <= 1) return text;

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("[") && part.endsWith("]")) {
          const name = part.slice(1, -1);
          if (/^\d+$/.test(name)) return <span key={i}>{part}</span>;
          const url = sourceUrls?.[name];
          if (url) {
            return (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="source-citation-chip"
              >
                {name}
              </a>
            );
          }
          return <span key={i} className="source-citation-chip source-citation-static">{name}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ─── Bold-First-Sentence Renderer ─────────────────────────
// Splits text at the first sentence boundary and bolds the lead.
// Also handles inline citations.
function renderWithBoldLead(text: string, sourceUrls?: Record<string, string>): React.ReactNode {
  const hasCitations = /\[[^\]]+\]/.test(text) && !/^\[\d+\]/.test(text);

  // Find first sentence: text up to first ". " or "! " or "? " (not inside quotes)
  const match = text.match(/^(.+?[.!?])\s+([\s\S]*)$/);
  if (match) {
    return (
      <>
        <strong className="font-semibold text-text-primary">
          {hasCitations ? renderWithCitations(match[1], sourceUrls) : match[1]}
        </strong>{" "}
        <span className="text-text-secondary">
          {hasCitations ? renderWithCitations(match[2], sourceUrls) : match[2]}
        </span>
      </>
    );
  }
  // No sentence boundary found — just render as-is
  if (hasCitations) return <span className="text-text-primary">{renderWithCitations(text, sourceUrls)}</span>;
  return <span className="text-text-primary">{text}</span>;
}

// ─── Bullet Splitter ──────────────────────────────────────
// Detects inline bullets (• or - at segment boundaries) and splits them.
function hasBulletItems(text: string): boolean {
  // Check for bullet markers: lines starting with •, -, or ·
  // OR inline bullets like "• text • text"
  return /(?:^|\n)\s*[•\-·]\s/m.test(text) || /[.!?]\s+[•\-·]\s/.test(text);
}

function splitBulletItems(text: string): string[] {
  // First try line-level bullets
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const allBullets = lines.every((l) => /^[•\-·]\s/.test(l));
  if (allBullets && lines.length > 1) {
    return lines.map((l) => l.replace(/^[•\-·]\s*/, ""));
  }

  // Try inline splitting: "• item1 • item2" or "- item1 - item2"
  const inlineSplit = text.split(/\s*[•·]\s+/).filter((s) => s.trim().length > 5);
  if (inlineSplit.length > 1) return inlineSplit;

  // Try splitting on " - " as bullet separator (common in digests)
  const dashSplit = text.split(/\s+-\s+/).filter((s) => s.trim().length > 5);
  if (dashSplit.length > 2) return dashSplit;

  return [];
}

// ─── Section Header ───────────────────────────────────────
export function SectionHeader({
  label,
  tier,
}: {
  label: string;
  tier?: SectionTier;
}) {
  const resolvedTier = tier || getSectionTier(label);
  const iconConfig = SECTION_ICONS[label];
  const fontSize = resolvedTier === "primary" ? "text-[16px]" : resolvedTier === "secondary" ? "text-[14px]" : "text-[13px]";
  const Icon = iconConfig?.Icon;

  return (
    <div className="mt-6 mb-3 pb-2 border-b border-border-primary/50">
      <h4
        className={`flex items-center gap-2 ${fontSize} font-semibold uppercase tracking-[0.08em]`}
        style={{ color: iconConfig?.color || "var(--text-primary)" }}
      >
        {Icon && <Icon size={14} strokeWidth={2} aria-hidden="true" />}
        {label}
      </h4>
    </div>
  );
}

// ─── Bullet Item ──────────────────────────────────────────
function BulletItem({ text, sourceUrls }: { text: string; sourceUrls?: Record<string, string> }) {
  return (
    <div className="border-l-[3px] border-border-primary pl-3 py-1">
      <p className="text-[15px] leading-[1.7] font-sans">
        {renderWithBoldLead(text, sourceUrls)}
      </p>
    </div>
  );
}

// ─── Callout Block (So What / Contrarian Take) ────────────
export function CalloutBlock({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  return (
    <div className="mt-4 bg-bg-secondary border-l-[3px] border-accent-primary p-4">
      <p className="text-[12px] uppercase tracking-[0.08em] font-bold mb-2" style={{ color: "var(--accent-primary)" }}>
        {label}
      </p>
      <p className="font-serif text-[16px] italic leading-[1.6] text-text-primary">
        {text}
      </p>
    </div>
  );
}

// ─── Subtle Callout (Watch Next) ─────────────
export function SubtleCallout({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  const bullets = hasBulletItems(text) ? splitBulletItems(text) : [];
  const iconConfig = SECTION_ICONS[label];
  const Icon = iconConfig?.Icon;

  return (
    <div className="mt-4 border-l-[3px] border-dashed border-border-primary bg-bg-secondary/50 p-4">
      <p className="flex items-center gap-1.5 text-[12px] uppercase tracking-[0.08em] font-semibold mb-2 text-text-tertiary">
        {Icon && <Icon size={13} strokeWidth={2} aria-hidden="true" />}
        {label}
      </p>
      {bullets.length > 0 ? (
        <div className="space-y-2">
          {bullets.map((item, i) => (
            <BulletItem key={i} text={item} />
          ))}
        </div>
      ) : (
        <p className="text-[15px] leading-[1.7] font-sans text-text-secondary">
          {text}
        </p>
      )}
    </div>
  );
}

// ─── Section Body ─────────────────────────────────────────
// Renders text with bold-first-sentence, bullet splitting, and inline citations.
export function SectionBody({ text, sourceUrls }: { text: string; sourceUrls?: Record<string, string> }) {
  const bullets = hasBulletItems(text) ? splitBulletItems(text) : [];

  if (bullets.length > 0) {
    return (
      <div className="space-y-2">
        {bullets.map((item, i) => (
          <BulletItem key={i} text={item} sourceUrls={sourceUrls} />
        ))}
      </div>
    );
  }

  return (
    <p className="text-[15px] leading-[1.7] font-sans">
      {renderWithBoldLead(text, sourceUrls)}
    </p>
  );
}

// ─── Complete Scannable Section ───────────────────────────
// Renders a full section: header + body, with appropriate styling
// based on section type (callout, subtle callout, or regular).
export function ScannableSection({
  label,
  text,
  tier,
  sourceUrls,
}: {
  label: string;
  text: string;
  tier?: SectionTier;
  sourceUrls?: Record<string, string>;
}) {
  if (CALLOUT_SECTIONS.has(label)) {
    return <CalloutBlock label={label} text={text} />;
  }

  if (SUBTLE_CALLOUT_SECTIONS.has(label)) {
    return <SubtleCallout label={label} text={text} />;
  }

  return (
    <div>
      <SectionHeader label={label} tier={tier} />
      <SectionBody text={text} sourceUrls={sourceUrls} />
    </div>
  );
}

// ─── Digest Section Body ─────────────────────────────────
// Enhanced body renderer that detects inline callouts like "→ So What:" and "Bottom line:".
// Splits the body into sub-blocks: regular text/bullets and callout blocks.
export function DigestSectionBody({ text, sourceUrls }: { text: string; sourceUrls?: Record<string, string> }) {
  // Split body into segments at callout markers
  const segments: { type: "text" | "callout"; label?: string; content: string }[] = [];
  const lines = text.split("\n");
  let currentLines: string[] = [];

  function flushText() {
    if (currentLines.length > 0) {
      segments.push({ type: "text", content: currentLines.join("\n") });
      currentLines = [];
    }
  }

  for (const line of lines) {
    // Detect "→ So What:" or "→ Bottom Line:" or "Bottom line:" patterns
    const calloutMatch = line.match(/^(?:→\s*)?(?:(So What|Bottom Line|Bottom line|Key Takeaway|Watch Next|The Upshot|Contrarian Take))\s*[:\-–—]\s*(.*)/i);
    if (calloutMatch) {
      flushText();
      const label = calloutMatch[1];
      const rest = calloutMatch[2].trim();
      segments.push({ type: "callout", label, content: rest });
      continue;
    }
    currentLines.push(line);
  }
  flushText();

  if (segments.length <= 1 && segments[0]?.type === "text") {
    // No callouts found — render normally
    return <SectionBody text={text} sourceUrls={sourceUrls} />;
  }

  return (
    <div className="space-y-3">
      {segments.map((seg, i) => {
        if (seg.type === "callout") {
          return <CalloutBlock key={i} label={seg.label || "So What"} text={seg.content} />;
        }
        return <SectionBody key={i} text={seg.content} sourceUrls={sourceUrls} />;
      })}
    </div>
  );
}

// ─── Key Quote Pullquote ─────────────────────────────────
// Renders a direct quote as a styled pullquote with attribution.
export function KeyQuotePullquote({
  quote,
  attribution,
}: {
  quote: string;
  attribution?: string;
}) {
  return (
    <blockquote className="key-quote-pullquote">
      <p className="font-serif text-[17px] italic leading-[1.6] text-text-primary text-center">
        &ldquo;{quote}&rdquo;
      </p>
      {attribution && (
        <p className="mt-2 text-center text-[13px] text-text-secondary">
          — {attribution}
        </p>
      )}
    </blockquote>
  );
}

// ─── Source Excerpt Block ─────────────────────────────────
// Blockquote-styled excerpt from original source content.
export function SourceExcerptBlock({
  sourceName,
  excerpt,
}: {
  sourceName: string;
  excerpt: string;
}) {
  return (
    <div className="source-excerpt-block">
      <p className="text-[11px] text-text-tertiary mb-1">
        From <span className="font-semibold">{sourceName}</span>:
      </p>
      <blockquote className="border-l-2 border-border-primary pl-3 italic text-[13px] leading-[1.7] text-text-secondary">
        {excerpt}
      </blockquote>
    </div>
  );
}
