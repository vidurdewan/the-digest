"use client";

import React from "react";

// ─── Shared Icons for Section Headers ─────────────────────
// Map section labels to emoji/icon identifiers for consistent styling
const SECTION_ICONS: Record<string, { icon: string; color: string }> = {
  "The News": { icon: "🔴", color: "var(--accent-primary)" },
  "Why It Matters": { icon: "💡", color: "var(--accent-warning)" },
  "The Context": { icon: "🌐", color: "var(--accent-success)" },
  "So What": { icon: "⚡", color: "var(--accent-primary)" },
  "Watch Next": { icon: "👁", color: "var(--text-tertiary)" },
  "Work Radar": { icon: "💼", color: "var(--text-tertiary)" },
  "Contrarian Take": { icon: "⚠️", color: "var(--accent-warning)" },
  "Top Stories": { icon: "📰", color: "var(--accent-primary)" },
  "Trends & Signals": { icon: "📊", color: "var(--accent-primary)" },
  "Market & Deal Activity": { icon: "📈", color: "var(--accent-success)" },
  "People Moves": { icon: "👤", color: "var(--text-secondary)" },
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
  "Work Radar",
]);

type SectionTier = "primary" | "secondary" | "tertiary";

function getSectionTier(label: string): SectionTier {
  if (label === "The News") return "primary";
  if (["Why It Matters", "The Context", "Top Stories", "Trends & Signals", "Market & Deal Activity", "People Moves"].includes(label)) return "secondary";
  return "tertiary";
}

// ─── Bold-First-Sentence Renderer ─────────────────────────
// Splits text at the first sentence boundary and bolds the lead.
function renderWithBoldLead(text: string): React.ReactNode {
  // Find first sentence: text up to first ". " or "! " or "? " (not inside quotes)
  const match = text.match(/^(.+?[.!?])\s+([\s\S]*)$/);
  if (match) {
    return (
      <>
        <strong className="font-semibold text-text-primary">{match[1]}</strong>{" "}
        <span className="text-text-secondary">{match[2]}</span>
      </>
    );
  }
  // No sentence boundary found — just render as-is
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

  return (
    <div className="mt-6 mb-3 pb-2 border-b border-border-primary/50">
      <h4
        className={`flex items-center gap-2 ${fontSize} font-semibold uppercase tracking-[0.08em]`}
        style={{ color: iconConfig?.color || "var(--text-primary)" }}
      >
        {iconConfig && <span>{iconConfig.icon}</span>}
        {label}
      </h4>
    </div>
  );
}

// ─── Bullet Item ──────────────────────────────────────────
function BulletItem({ text }: { text: string }) {
  return (
    <div className="border-l-[3px] border-border-primary pl-3 py-1">
      <p className="text-[15px] leading-[1.7] font-sans">
        {renderWithBoldLead(text)}
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

// ─── Subtle Callout (Watch Next / Work Radar) ─────────────
export function SubtleCallout({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  const bullets = hasBulletItems(text) ? splitBulletItems(text) : [];

  return (
    <div className="mt-4 border-l-[3px] border-dashed border-border-primary bg-bg-secondary/50 p-4">
      <p className="text-[12px] uppercase tracking-[0.08em] font-semibold mb-2 text-text-tertiary">
        {SECTION_ICONS[label]?.icon} {label}
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
// Renders text with bold-first-sentence and bullet splitting.
export function SectionBody({ text }: { text: string }) {
  const bullets = hasBulletItems(text) ? splitBulletItems(text) : [];

  if (bullets.length > 0) {
    return (
      <div className="space-y-2">
        {bullets.map((item, i) => (
          <BulletItem key={i} text={item} />
        ))}
      </div>
    );
  }

  return (
    <p className="text-[15px] leading-[1.7] font-sans">
      {renderWithBoldLead(text)}
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
}: {
  label: string;
  text: string;
  tier?: SectionTier;
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
      <SectionBody text={text} />
    </div>
  );
}
