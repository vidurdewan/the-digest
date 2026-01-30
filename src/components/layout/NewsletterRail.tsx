"use client";

import { useState } from "react";
import type { Newsletter } from "@/types";
import { useSidebarStore } from "@/lib/store";

interface NewsletterRailProps {
  newsletters: Newsletter[];
  onNavigateToNewsletter?: (id: string) => void;
}

/** Strip markdown formatting (bold **text**, *text*) and return plain text */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

/** Truncate text to ~maxWords words and add ellipsis */
function truncateWords(text: string, maxWords: number): string {
  const cleaned = stripMarkdown(text).trim();
  const words = cleaned.split(/\s+/);
  if (words.length <= maxWords) return cleaned;
  return words.slice(0, maxWords).join(" ") + "...";
}

function extractBulletPoints(newsletter: Newsletter): string[] {
  const points: string[] = [];
  const ns = newsletter.newsletterSummary;
  if (ns) {
    if (ns.theNews) points.push(ns.theNews);
    if (ns.whyItMatters) points.push(ns.whyItMatters);
    if (ns.theContext) points.push(ns.theContext);
  }
  // Fallback to summary brief
  if (points.length === 0 && newsletter.summary?.brief) {
    const sentences = newsletter.summary.brief
      .split(/\.\s+/)
      .filter((s) => s.trim().length > 10)
      .slice(0, 3);
    return sentences.map((s) => (s.endsWith(".") ? s : s + "."));
  }
  return points.slice(0, 3);
}

/** Extract full text for inline expansion */
function extractFullText(newsletter: Newsletter): string {
  const ns = newsletter.newsletterSummary;
  if (ns) {
    const parts: string[] = [];
    if (ns.theNews) parts.push(stripMarkdown(ns.theNews));
    if (ns.whyItMatters) parts.push(stripMarkdown(ns.whyItMatters));
    if (ns.theContext) parts.push(stripMarkdown(ns.theContext));
    if (ns.soWhat) parts.push(stripMarkdown(ns.soWhat));
    if (ns.watchNext) parts.push(stripMarkdown(ns.watchNext));
    return parts.join("\n\n");
  }
  if (newsletter.summary?.brief) return stripMarkdown(newsletter.summary.brief);
  return "";
}

/** Build dynamic daily digest summary from newsletter data */
function buildDailyDigestSummary(newsletters: Newsletter[]): string {
  if (newsletters.length === 0) return "";
  const sources = newsletters.slice(0, 3).map((nl) => nl.publication);
  const subjects = newsletters.slice(0, 3).map((nl) => {
    const words = nl.subject.split(/\s+/).slice(0, 6).join(" ");
    return words.length < nl.subject.length ? words + "..." : words;
  });

  const sourceList =
    sources.length === 1
      ? sources[0]
      : sources.length === 2
      ? `${sources[0]} and ${sources[1]}`
      : `${sources[0]}, ${sources[1]}, and ${sources[2]}`;

  return `Today\u2019s highlights from ${sourceList} \u2014 covering ${subjects.join(", ")}.`;
}

export function NewsletterRail({
  newsletters,
  onNavigateToNewsletter,
}: NewsletterRailProps) {
  const setActiveSection = useSidebarStore((s) => s.setActiveSection);
  const recentNewsletters = newsletters.slice(0, 4);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleReadFull = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  const digestSummary = buildDailyDigestSummary(newsletters);

  return (
    <div
      className="sticky top-[calc(3.5rem+2rem)] max-h-[calc(100vh-3.5rem-3rem)] overflow-y-auto scrollbar-rail"
    >
      {/* Inbox Intelligence Header */}
      <div className="mb-0 pb-6 border-b border-border-primary">
        <p className="flex items-center gap-1.5 typo-section-label text-text-secondary">
          <span className="text-accent-primary">●</span>
          Inbox Intelligence
        </p>
        <h2 className="mt-2 font-serif text-lg font-bold text-text-primary">
          Daily Digest
        </h2>
        <p className="mt-1.5 text-sm text-text-secondary">
          {digestSummary ||
            `We\u2019ve parsed ${newsletters.length} newsletter${
              newsletters.length !== 1 ? "s" : ""
            } from your inbox and summarized the key points.`}
        </p>
      </div>

      {/* Newsletter Cards */}
      {recentNewsletters.map((nl) => {
        const bullets = extractBulletPoints(nl);
        const isExpanded = expandedId === nl.id;
        const fullText = isExpanded ? extractFullText(nl) : "";
        return (
          <div key={nl.id} className="border-b border-border-primary">
            <div className="py-6">
              <p className="uppercase text-xs tracking-widest font-semibold text-text-secondary mb-1">
                {nl.publication}
              </p>
              <h3 className="font-serif font-bold text-lg text-text-primary">
                {stripMarkdown(nl.subject)}
              </h3>

              {!isExpanded && bullets.length > 0 && (
                <div className="mt-3 space-y-2">
                  {bullets.map((point, i) => (
                    <p
                      key={i}
                      className="text-sm text-text-secondary"
                    >
                      — {truncateWords(point, 18)}
                    </p>
                  ))}
                </div>
              )}

              {isExpanded && fullText && (
                <div className="mt-3 text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                  {fullText}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => handleReadFull(nl.id)}
                  className="pill-outlined hover:bg-bg-hover transition-colors"
                >
                  {isExpanded ? "Collapse" : "Read Full"}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {recentNewsletters.length === 0 && (
        <div className="py-8 text-center text-sm text-text-tertiary">
          No newsletters yet. Connect Gmail to get started.
        </div>
      )}
    </div>
  );
}
