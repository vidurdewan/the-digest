"use client";

import type { Newsletter } from "@/types";
import { useSidebarStore } from "@/lib/store";

interface NewsletterRailProps {
  newsletters: Newsletter[];
  onNavigateToNewsletter?: (id: string) => void;
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
    // Split on sentences, take first 2-3
    const sentences = newsletter.summary.brief
      .split(/\.\s+/)
      .filter((s) => s.trim().length > 10)
      .slice(0, 3);
    return sentences.map((s) => (s.endsWith(".") ? s : s + "."));
  }
  return points.slice(0, 3);
}

export function NewsletterRail({
  newsletters,
  onNavigateToNewsletter,
}: NewsletterRailProps) {
  const setActiveSection = useSidebarStore((s) => s.setActiveSection);
  const recentNewsletters = newsletters.slice(0, 4);

  const handleReadFull = (id: string) => {
    setActiveSection("newsletters");
    onNavigateToNewsletter?.(id);
  };

  return (
    <div
      className="sticky top-[calc(3.5rem+1.5rem)] max-h-[calc(100vh-3.5rem-3rem)] overflow-y-auto scrollbar-rail"
    >
      {/* Inbox Intelligence Header */}
      <div className="mb-0 pb-6 border-b border-border-primary">
        <p className="flex items-center gap-1.5 typo-section-label text-text-secondary">
          <span className="text-accent-primary">●</span>
          Inbox Intelligence
        </p>
        <h2 className="mt-2 font-heading text-xl font-bold text-text-primary">
          Daily Digest
        </h2>
        <p className="mt-1.5 text-sm text-text-secondary">
          We&apos;ve parsed {newsletters.length} newsletter
          {newsletters.length !== 1 ? "s" : ""} from your inbox and summarized
          the key points.
        </p>
      </div>

      {/* Newsletter Cards */}
      {recentNewsletters.map((nl, idx) => {
        const bullets = extractBulletPoints(nl);
        return (
          <div key={nl.id} className="border-b border-border-primary">
            <div className="py-6">
              <p className="typo-section-label text-text-secondary">
                {nl.publication}
              </p>
              <h3 className="mt-2 typo-rail-headline text-text-primary">
                {nl.subject}
              </h3>
              {bullets.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {bullets.map((point, i) => (
                    <p
                      key={i}
                      className="typo-rail-bullet"
                    >
                      — {point}
                    </p>
                  ))}
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => handleReadFull(nl.id)}
                  className="pill-outlined hover:bg-bg-hover transition-colors"
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
  );
}
