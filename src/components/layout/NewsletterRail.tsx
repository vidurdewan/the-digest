"use client";

import { useState, useEffect, useCallback } from "react";
import type { Newsletter } from "@/types";

interface NewsletterRailProps {
  newsletters: Newsletter[];
  onNavigateToNewsletter?: (id: string) => void;
  dailyDigest: string | null;
  isGeneratingDigest: boolean;
  onGenerateDigest?: () => Promise<void>;
}

// ─── Helpers ───────────────────────────────────────────────

/** Strip markdown formatting and common artifacts */
function stripMarkdown(text: string): string {
  return text
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
  // Get first few sentences up to maxWords
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

// ─── Modal Component ───────────────────────────────────────

function NewsletterModal({
  newsletter,
  onClose,
}: {
  newsletter: Newsletter | null;
  onClose: () => void;
}) {
  // Close on Escape key
  useEffect(() => {
    if (!newsletter) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [newsletter, onClose]);

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
        <div className="space-y-5">
          {sections.map((section, i) => (
            <div key={i}>
              <h3 className="font-serif text-sm font-bold text-text-primary uppercase tracking-wide mb-1.5">
                {section.label}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {section.text}
              </p>
            </div>
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
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Parse the digest markdown into formatted sections
  const lines = stripMarkdown(digest).split("\n").filter((l) => l.trim());

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

        <div className="space-y-3">
          {lines.map((line, i) => {
            // Detect section headers (lines that are all caps or end with colon)
            const isHeader = /^[A-Z\s&]+:?$/.test(line.trim()) || /^#+\s/.test(line.trim());
            if (isHeader) {
              return (
                <h3 key={i} className="font-serif text-sm font-bold text-text-primary uppercase tracking-wide mt-4 mb-1">
                  {line.replace(/^#+\s/, "").replace(/:$/, "")}
                </h3>
              );
            }
            return (
              <p key={i} className="text-sm text-text-secondary leading-relaxed">
                {line}
              </p>
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
  dailyDigest,
  isGeneratingDigest,
  onGenerateDigest,
}: NewsletterRailProps) {
  const recentNewsletters = newsletters.slice(0, 4);
  const [modalNewsletter, setModalNewsletter] = useState<Newsletter | null>(null);
  const [showDigestModal, setShowDigestModal] = useState(false);

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

  // Truncated digest preview for the rail
  const digestPreview = dailyDigest ? truncateDigest(dailyDigest, 90) : null;

  return (
    <>
      <div className="sticky top-[calc(3.5rem+2rem)] max-h-[calc(100vh-3.5rem-3rem)] overflow-y-auto scrollbar-rail">
        {/* ── Daily Digest / Intelligence Briefing ── */}
        <div className="mb-0 pb-6 border-b border-border-primary">
          <p className="flex items-center gap-1.5 uppercase text-xs tracking-[0.15em] font-semibold text-text-secondary">
            <span className="text-accent-primary">●</span>
            Inbox Intelligence
          </p>
          <h2 className="mt-2 font-serif text-lg font-bold text-text-primary">
            Daily Digest
          </h2>

          {digestPreview ? (
            <>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                {digestPreview}
              </p>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleOpenDigestModal}
                  className="border border-text-primary text-xs uppercase tracking-wider px-4 py-1.5 bg-transparent text-text-primary hover:bg-text-primary hover:text-bg-primary transition-colors"
                >
                  Read Full
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
                    className="border border-text-primary text-xs uppercase tracking-wider px-4 py-1.5 bg-transparent text-text-primary hover:bg-text-primary hover:text-bg-primary transition-colors"
                  >
                    Generate
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Newsletter Cards ── */}
        {recentNewsletters.map((nl) => {
          const bullets = extractBulletPoints(nl);
          return (
            <div key={nl.id} className="border-b border-border-primary">
              <div className="py-6">
                <p className="uppercase text-xs tracking-[0.15em] font-semibold text-text-secondary mb-1">
                  {nl.publication}
                </p>
                <h3 className="font-serif font-bold text-base leading-snug text-text-primary mb-3">
                  {stripMarkdown(nl.subject)}
                </h3>

                {bullets.length > 0 && (
                  <div className="space-y-2">
                    {bullets.map((point, i) => (
                      <p key={i} className="text-sm text-text-secondary leading-relaxed">
                        — {point}
                      </p>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleOpenModal(nl)}
                    className="border border-text-primary text-xs uppercase tracking-wider px-4 py-1.5 bg-transparent text-text-primary hover:bg-text-primary hover:text-bg-primary transition-colors"
                  >
                    Read Full
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
