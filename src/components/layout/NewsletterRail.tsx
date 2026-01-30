"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Newsletter, Article, Summary } from "@/types";
import { ScannableSection, CalloutBlock, SectionBody, SectionHeader, DigestSectionBody } from "@/components/ui/ScannableText";
import { useReadStateStore } from "@/lib/store";
import { findMatchingArticleIds } from "@/lib/cross-references";

interface NewsletterRailProps {
  newsletters: Newsletter[];
  articles?: (Article & { summary?: Summary })[];
  onNavigateToNewsletter?: (id: string) => void;
  dailyDigest: string | null;
  isGeneratingDigest: boolean;
  onGenerateDigest?: () => Promise<void>;
}

// ─── Helpers ───────────────────────────────────────────────

/** Strip markdown formatting and common artifacts */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")         // strip heading markers
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[•●]\s*/gm, "")          // strip bullet markers
    .replace(/<[^>]+>/g, "")              // strip HTML tags
    .trim();
}

/** Truncate text to ~maxWords words with ellipsis */
function truncateWords(text: string, maxWords: number): string {
  const cleaned = stripMarkdown(text).trim();
  const words = cleaned.split(/\s+/);
  if (words.length <= maxWords) return cleaned;
  return words.slice(0, maxWords).join(" ") + "...";
}

/** Extract 2-3 short bullet points from newsletter AI summary */
function extractBulletPoints(newsletter: Newsletter): string[] {
  const ns = newsletter.newsletterSummary;
  if (ns) {
    const points: string[] = [];
    if (ns.theNews) points.push(truncateWords(ns.theNews, 20));
    if (ns.whyItMatters) points.push(truncateWords(ns.whyItMatters, 20));
    if (ns.theContext) points.push(truncateWords(ns.theContext, 20));
    return points.slice(0, 3);
  }
  // Fallback to summary brief sentences
  if (newsletter.summary?.brief) {
    return newsletter.summary.brief
      .split(/\.\s+/)
      .filter((s) => s.trim().length > 10)
      .slice(0, 3)
      .map((s) => truncateWords(s.endsWith(".") ? s : s + ".", 20));
  }
  return [];
}

/** Build full formatted text for the modal */
function extractFullContent(newsletter: Newsletter): { sections: { label: string; text: string }[] } {
  const ns = newsletter.newsletterSummary;
  const sections: { label: string; text: string }[] = [];
  if (ns) {
    if (ns.theNews) sections.push({ label: "The News", text: stripMarkdown(ns.theNews) });
    if (ns.whyItMatters) sections.push({ label: "Why It Matters", text: stripMarkdown(ns.whyItMatters) });
    if (ns.theContext) sections.push({ label: "The Context", text: stripMarkdown(ns.theContext) });
    if (ns.soWhat) sections.push({ label: "So What", text: stripMarkdown(ns.soWhat) });
    if (ns.watchNext) sections.push({ label: "Watch Next", text: stripMarkdown(ns.watchNext) });
  }
  if (sections.length === 0 && newsletter.summary?.brief) {
    sections.push({ label: "Summary", text: stripMarkdown(newsletter.summary.brief) });
  }
  return { sections };
}

/** Truncate digest to ~80-100 words for the rail preview */
function truncateDigest(digest: string, maxWords: number = 90): string {
  const cleaned = stripMarkdown(digest);
  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  let result = "";
  let wordCount = 0;
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).length;
    if (wordCount + words > maxWords && result.length > 0) break;
    result += (result ? " " : "") + sentence;
    wordCount += words;
    if (wordCount >= maxWords) break;
  }
  return result || cleaned.split(/\s+/).slice(0, maxWords).join(" ") + "...";
}

/** Parse daily digest into structured preview for the sidebar card */
function parseDigestPreview(digest: string): {
  oneLiner: string | null;
  topStoriesSnippet: string | null;
} {
  const lines = digest.split("\n");
  let oneLiner: string | null = null;
  let topStoriesSnippet: string | null = null;
  let currentSection = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^#{1,3}\s+Today'?s One[- ]Liner/i.test(line)) {
      currentSection = "oneliner";
      continue;
    }
    if (/^#{1,3}\s+Top Stories/i.test(line)) {
      currentSection = "topstories";
      continue;
    }
    if (/^#{1,3}\s+/.test(line) && currentSection) {
      // Next section — stop collecting
      break;
    }
    if (currentSection === "oneliner" && line && !oneLiner) {
      oneLiner = stripMarkdown(line);
    }
    if (currentSection === "topstories" && line && !topStoriesSnippet) {
      // Grab text up to ~150 chars
      const cleaned = stripMarkdown(line);
      topStoriesSnippet = cleaned.length > 150 ? cleaned.slice(0, 150) + "..." : cleaned;
    }
  }
  return { oneLiner, topStoriesSnippet };
}

// ─── Modal Component ───────────────────────────────────────

function NewsletterModal({
  newsletter,
  onClose,
}: {
  newsletter: Newsletter | null;
  onClose: () => void;
}) {
  const markNewsletterRead = useReadStateStore((s) => s.markNewsletterRead);

  // Close on Escape key
  useEffect(() => {
    if (!newsletter) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [newsletter, onClose]);

  // Auto-mark newsletter as read after 3s in modal
  useEffect(() => {
    if (!newsletter) return;
    const timer = setTimeout(() => {
      markNewsletterRead(newsletter.id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [newsletter, markNewsletterRead]);

  if (!newsletter) return null;

  const { sections } = extractFullContent(newsletter);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto bg-bg-primary p-8 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors text-xl leading-none"
          aria-label="Close"
        >
          &times;
        </button>

        {/* Header */}
        <p className="uppercase text-xs tracking-[0.15em] font-semibold text-text-secondary mb-2">
          {newsletter.publication}
        </p>
        <h2 className="font-serif text-2xl font-bold text-text-primary leading-snug mb-6">
          {stripMarkdown(newsletter.subject)}
        </h2>

        {/* Content sections */}
        <div>
          {sections.map((section, i) => (
            <ScannableSection key={i} label={section.label} text={section.text} />
          ))}
        </div>

        {sections.length === 0 && (
          <p className="text-sm text-text-tertiary">No summary available for this newsletter.</p>
        )}
      </div>
    </div>
  );
}

function DigestModal({
  digest,
  onClose,
}: {
  digest: string;
  onClose: () => void;
}) {
  const markDigestRead = useReadStateStore((s) => s.markDigestRead);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Auto-mark digest as read after 3s
  useEffect(() => {
    const timer = setTimeout(() => markDigestRead(), 3000);
    return () => clearTimeout(timer);
  }, [markDigestRead]);

  // Parse digest into sections: { label, body }
  const sections: { label: string; body: string }[] = [];
  const rawLines = digest.split("\n");
  let currentLabel = "";
  let currentBody: string[] = [];

  for (const line of rawLines) {
    const headingMatch = line.match(/^#{1,6}\s+(.*)/);
    const isAllCapsHeader = !headingMatch && /^[A-Z\s&']+:?$/.test(line.trim()) && line.trim().length > 3;
    if (headingMatch || isAllCapsHeader) {
      // Save previous section
      if (currentLabel && currentBody.length > 0) {
        sections.push({ label: currentLabel, body: currentBody.join("\n") });
      }
      currentLabel = stripMarkdown(headingMatch ? headingMatch[1] : line.trim().replace(/:$/, ""));
      currentBody = [];
    } else if (line.trim()) {
      currentBody.push(stripMarkdown(line));
    }
  }
  if (currentLabel && currentBody.length > 0) {
    sections.push({ label: currentLabel, body: currentBody.join("\n") });
  }

  // Filter out empty/placeholder sections
  const filteredSections = sections.filter((s) => {
    const lower = s.body.toLowerCase().trim();
    return !(
      /^no (significant|notable|major|meaningful|relevant|new|reported|specific)/.test(lower) ||
      /^nothing (significant|notable|major)/.test(lower) ||
      /^none (reported|noted|identified|observed)/.test(lower) ||
      lower === "none." || lower === "n/a" || lower === "none"
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto bg-bg-primary p-8 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors text-xl leading-none"
          aria-label="Close"
        >
          &times;
        </button>

        <p className="flex items-center gap-1.5 uppercase text-xs tracking-[0.15em] font-semibold text-text-secondary mb-2">
          <span className="text-accent-primary">●</span>
          Intelligence Briefing
        </p>
        <h2 className="font-serif text-2xl font-bold text-text-primary leading-snug mb-6">
          Daily Digest
        </h2>

        <div>
          {filteredSections.map((section, i) => {
            // Today's One-Liner — special callout style
            if (/one[- ]liner/i.test(section.label)) {
              return (
                <div key={i} className="mb-6 border-l-4 border-accent-primary pl-4 py-2">
                  <p className="text-[12px] uppercase tracking-[0.08em] font-semibold text-text-tertiary mb-2">
                    {section.label}
                  </p>
                  <p className="font-serif text-[18px] italic leading-[1.5] text-text-primary">
                    {section.body}
                  </p>
                </div>
              );
            }
            // Contrarian Take — elevated callout
            if (/contrarian/i.test(section.label)) {
              return <CalloutBlock key={i} label={section.label} text={section.body} />;
            }
            // All other sections — scannable with inline callout parsing
            return (
              <div key={i}>
                <SectionHeader label={section.label} />
                <DigestSectionBody text={section.body} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────

export function NewsletterRail({
  newsletters,
  articles,
  dailyDigest,
  isGeneratingDigest,
  onGenerateDigest,
}: NewsletterRailProps) {
  const recentNewsletters = newsletters.slice(0, 4);
  const [modalNewsletter, setModalNewsletter] = useState<Newsletter | null>(null);
  const [showDigestModal, setShowDigestModal] = useState(false);
  const readNewsletterIds = useReadStateStore((s) => s.readNewsletterIds);

  // Listen for open-newsletter-modal events from IntelligenceFeed cross-references
  useEffect(() => {
    const handler = (e: Event) => {
      const nlId = (e as CustomEvent<{ id: string }>).detail.id;
      const nl = newsletters.find((n) => n.id === nlId);
      if (nl) setModalNewsletter(nl);
    };
    window.addEventListener("open-newsletter-modal", handler);
    return () => window.removeEventListener("open-newsletter-modal", handler);
  }, [newsletters]);

  // Pre-compute matching article IDs for hover highlight
  const hoverMatchMap = useMemo(() => {
    if (!articles || articles.length === 0) return new Map<string, string[]>();
    const map = new Map<string, string[]>();
    for (const nl of recentNewsletters) {
      map.set(nl.id, findMatchingArticleIds(nl, articles));
    }
    return map;
  }, [recentNewsletters, articles]);

  const handleHoverEnter = useCallback((nlId: string) => {
    const ids = hoverMatchMap.get(nlId) ?? [];
    window.dispatchEvent(new CustomEvent("newsletter-hover", { detail: ids }));
  }, [hoverMatchMap]);

  const handleHoverLeave = useCallback(() => {
    window.dispatchEvent(new CustomEvent("newsletter-hover", { detail: [] }));
  }, []);

  const handleOpenModal = useCallback((nl: Newsletter) => {
    setModalNewsletter(nl);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalNewsletter(null);
  }, []);

  const handleOpenDigestModal = useCallback(() => {
    setShowDigestModal(true);
  }, []);

  const handleCloseDigestModal = useCallback(() => {
    setShowDigestModal(false);
  }, []);

  // Structured digest preview for the rail
  const digestPreview = dailyDigest ? parseDigestPreview(dailyDigest) : null;
  const digestFallback = dailyDigest ? truncateDigest(dailyDigest, 90) : null;

  return (
    <>
      <div className="sticky top-[calc(3.5rem+2rem)] max-h-[calc(100vh-3.5rem-3rem)] overflow-y-auto overflow-x-hidden scrollbar-rail min-w-0">
        {/* ── Daily Digest / Intelligence Briefing ── */}
        <div className="mb-4 pb-6 border-b border-border-primary bg-bg-secondary p-5">
          <p className="flex items-center gap-1.5 uppercase text-[11px] tracking-[0.15em] font-semibold text-text-secondary">
            <span className="text-accent-primary">●</span>
            Inbox Intelligence
          </p>
          <h2 className="mt-2 font-serif text-lg font-bold text-text-primary">
            Daily Digest
          </h2>

          {dailyDigest ? (
            <>
              {digestPreview?.oneLiner && (
                <p className="mt-3 text-[14px] font-semibold text-text-primary leading-snug break-words">
                  {digestPreview.oneLiner}
                </p>
              )}
              {digestPreview?.topStoriesSnippet && (
                <div className="mt-3">
                  <p className="text-[12px] uppercase tracking-[0.08em] font-semibold text-text-secondary mb-1">
                    Top Stories
                  </p>
                  <p className="text-[13px] text-text-secondary leading-relaxed break-words">
                    {digestPreview.topStoriesSnippet}
                  </p>
                </div>
              )}
              {!digestPreview?.oneLiner && !digestPreview?.topStoriesSnippet && (
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                  {digestFallback}
                </p>
              )}
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleOpenDigestModal}
                  className="text-[11px] uppercase tracking-[0.05em] font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  View full digest →
                </button>
              </div>
            </>
          ) : isGeneratingDigest ? (
            <p className="mt-2 text-sm text-text-tertiary italic">
              Generating intelligence briefing...
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-text-secondary">
                Generate your daily intelligence briefing from {newsletters.length} newsletter{newsletters.length !== 1 ? "s" : ""}.
              </p>
              {onGenerateDigest && newsletters.length > 0 && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => onGenerateDigest()}
                    className="text-[11px] uppercase tracking-[0.05em] font-medium text-accent-primary hover:text-text-primary transition-colors"
                  >
                    Generate →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Newsletter Cards ── */}
        {recentNewsletters.map((nl) => {
          const bullets = extractBulletPoints(nl);
          const isNlRead = nl.isRead || readNewsletterIds.includes(nl.id);
          return (
            <div
              key={nl.id}
              className={`my-6 pb-6 border-b border-border-primary/50 newsletter-card-hover transition-opacity duration-300 ${isNlRead ? "opacity-55" : ""}`}
              onMouseEnter={() => handleHoverEnter(nl.id)}
              onMouseLeave={handleHoverLeave}
            >
              <div className="px-5">
                <p className="uppercase text-[11px] tracking-[0.1em] font-semibold text-text-secondary mb-2 flex items-center gap-2">
                  {nl.publication}
                  {!isNlRead && <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-primary" />}
                </p>
                <h3 className="font-serif font-bold text-base leading-snug text-text-primary mb-3 line-clamp-3 break-words">
                  {stripMarkdown(nl.subject)}
                </h3>

                {bullets.length > 0 && (
                  <div className="space-y-2 pl-4">
                    {bullets.map((point, i) => (
                      <p key={i} className="text-sm text-text-secondary leading-relaxed break-words">
                        — {point}
                      </p>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleOpenModal(nl)}
                    className="text-[11px] uppercase tracking-[0.05em] font-medium text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Read full →
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

      {/* ── Modals ── */}
      <NewsletterModal newsletter={modalNewsletter} onClose={handleCloseModal} />
      {showDigestModal && dailyDigest && (
        <DigestModal digest={dailyDigest} onClose={handleCloseDigestModal} />
      )}
    </>
  );
}
