"use client";

import { useEffect, useState } from "react";
import {
  X,
  Clock,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Minus,
  Plus,
  ArrowRight,
} from "lucide-react";
import type { Article, Summary } from "@/types";
import { topicLabels, getRelativeTime } from "@/lib/mock-data";
import { QuickReactions } from "@/components/intelligence/QuickReactions";
import { GoDeeper } from "@/components/intelligence/GoDeeper";
import { RemindMeButton } from "@/components/intelligence/RemindMeButton";
import { SignalBadges } from "@/components/intelligence/SignalBadge";
import type { ArticleWithIntelligence } from "@/types";

/**
 * Decode common HTML entities and intelligently split article content into paragraphs.
 */
function decodeEntities(text: string): string {
  const textarea = typeof document !== "undefined" ? document.createElement("textarea") : null;
  if (textarea) {
    textarea.innerHTML = text;
    return textarea.value;
  }
  // SSR fallback — handle the most common entities
  return text
    .replace(/&#x27;/g, "'")
    .replace(/&#x2019;/g, "\u2019")
    .replace(/&#x2018;/g, "\u2018")
    .replace(/&#x201C;/g, "\u201C")
    .replace(/&#x201D;/g, "\u201D")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function splitIntoParagraphs(raw: string): string[] {
  const decoded = decodeEntities(raw);

  // 1. Try double-newline split (standard)
  const byDouble = decoded.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
  if (byDouble.length > 1) return byDouble;

  // 2. Try single-newline split
  const bySingle = decoded.split(/\n/).map((s) => s.trim()).filter(Boolean);
  if (bySingle.length > 1) return bySingle;

  // 3. No newlines at all — split at sentence boundaries roughly every 3-4 sentences
  const text = decoded.trim();
  if (!text) return [];
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s+|$)/g);
  if (!sentences || sentences.length <= 4) return [text];

  const paragraphs: string[] = [];
  let current = "";
  let count = 0;
  for (const sentence of sentences) {
    current += sentence;
    count++;
    // Break at natural transition points (after "." followed by a capital letter) every ~3 sentences
    if (count >= 3) {
      paragraphs.push(current.trim());
      current = "";
      count = 0;
    }
  }
  if (current.trim()) paragraphs.push(current.trim());
  return paragraphs;
}

/** Clean author string: extract display name from "email@example.com (Name)" format */
function cleanAuthor(author: string): string {
  // Pattern: email (Display Name) or email@domain.com (Display Name)
  const parenMatch = author.match(/\(([^)]+)\)/);
  if (parenMatch) return parenMatch[1];
  // If it looks like just an email, try to extract name from email prefix
  if (author.includes("@") && !author.includes(" ")) {
    const prefix = author.split("@")[0];
    return prefix
      .split(/[._-]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return author;
}

interface ReadingPaneProps {
  article: (Article & { summary?: Summary }) | null;
  onClose: () => void;
  onSave?: (id: string) => void;
  onRequestSummary?: (
    article: Article & { summary?: Summary }
  ) => Promise<Summary | null>;
}

export function ReadingPane({ article, onClose, onSave, onRequestSummary }: ReadingPaneProps) {
  const [fontSize, setFontSize] = useState(17);
  const [isSaved, setIsSaved] = useState(article?.isSaved ?? false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Sync saved state when article changes
  useEffect(() => {
    setIsSaved(article?.isSaved ?? false);
  }, [article?.id, article?.isSaved]);

  // Auto-request summary on open
  useEffect(() => {
    if (article && !article.summary?.theNews && onRequestSummary && !isLoadingSummary) {
      setIsLoadingSummary(true);
      onRequestSummary(article).finally(() => setIsLoadingSummary(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.id]);

  // Escape key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Lock body scroll when pane is open
  useEffect(() => {
    if (article) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [article]);

  if (!article) return null;

  const intelligence = (article as ArticleWithIntelligence).intelligence;
  const signals = (article as ArticleWithIntelligence).signals;

  const handleSave = () => {
    setIsSaved(!isSaved);
    onSave?.(article.id);
  };

  return (
    <>
      {/* Overlay backdrop */}
      <div
        className="reading-pane-backdrop fixed inset-0 z-40 bg-black/40 backdrop-blur-[4px]"
        onClick={onClose}
      />

      {/* Reading pane — always fixed drawer from right */}
      <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-bg-card border-l border-border-primary shadow-lg reading-pane-enter lg:w-[52%] lg:max-w-3xl">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-primary bg-bg-card/95 px-5 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-medium text-text-secondary truncate">
              {article.source}
            </span>
            <span className="text-text-tertiary shrink-0">&middot;</span>
            <span className="text-sm text-text-tertiary shrink-0">
              {getRelativeTime(article.publishedAt)}
            </span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Font size controls */}
            <button
              onClick={() => setFontSize(Math.max(14, fontSize - 1))}
              className="rounded-md p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors"
              aria-label="Decrease font size"
            >
              <Minus size={16} />
            </button>
            <button
              onClick={() => setFontSize(Math.min(24, fontSize + 1))}
              className="rounded-md p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors"
              aria-label="Increase font size"
            >
              <Plus size={16} />
            </button>
            <div className="mx-1 h-5 w-px bg-border-secondary" />
            <button
              onClick={handleSave}
              className="rounded-md p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors"
              aria-label={isSaved ? "Unsave" : "Save"}
            >
              {isSaved ? (
                <BookmarkCheck size={16} className="text-accent-primary" />
              ) : (
                <Bookmark size={16} />
              )}
            </button>
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors"
              aria-label="Open source"
            >
              <ExternalLink size={16} />
            </a>
            <button
              onClick={onClose}
              className="rounded-md p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Article content */}
        <div className="px-6 py-8 lg:px-8">
          {/* Topic tag */}
          <span className="topic-tag inline-flex rounded-full px-2.5 py-1 mb-4">
            {topicLabels[article.topic]}
          </span>

          {/* Title — serif */}
          <h1
            className="mb-4 font-bold leading-tight text-text-primary"
            style={{ fontSize: `${fontSize + 8}px` }}
          >
            {article.title}
          </h1>

          {/* Author & date */}
          <div className="mb-6 flex items-center gap-3 text-sm text-text-tertiary border-b border-border-secondary pb-6">
            {article.author && (
              <span className="font-medium text-text-secondary">
                By {cleanAuthor(article.author)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock size={13} />
              {article.readingTimeMinutes} min read
            </span>
            <span>
              {new Date(article.publishedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Signal badges */}
          {signals && signals.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              <SignalBadges signals={signals} max={4} />
            </div>
          )}

          {/* AI Summary section */}
          {article.summary?.theNews && (
            <div className="mb-8 space-y-4 rounded-xl border border-border-secondary bg-bg-secondary/50 p-5">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  The News
                </h4>
                <p
                  className="leading-relaxed text-text-secondary"
                  style={{ fontSize: `${fontSize - 1}px` }}
                >
                  {article.summary.theNews}
                </p>
              </div>

              {article.summary.whyItMatters && (
                <div className="rounded-lg bg-bg-tertiary/50 p-4">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-primary">
                    Why It Matters
                  </h4>
                  <p
                    className="leading-relaxed text-text-secondary"
                    style={{ fontSize: `${fontSize - 1}px` }}
                  >
                    {article.summary.whyItMatters}
                  </p>
                </div>
              )}

              {article.summary.theContext && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    The Context
                  </h4>
                  <p
                    className="leading-relaxed text-text-secondary"
                    style={{ fontSize: `${fontSize - 1}px` }}
                  >
                    {article.summary.theContext}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Watch for next */}
          {intelligence?.watchForNext && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-border-secondary bg-bg-secondary/30 p-4">
              <ArrowRight size={16} className="mt-0.5 shrink-0 text-accent-primary" />
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-accent-primary">
                  Watch for next
                </span>
                <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                  {intelligence.watchForNext}
                </p>
              </div>
            </div>
          )}

          {/* Full article content */}
          {article.content ? (
            <div
              className="prose max-w-none text-text-primary"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
            >
              {splitIntoParagraphs(article.content).map((paragraph, i) => (
                <p key={i} className="mb-5 text-text-primary">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border-secondary bg-bg-secondary p-8 text-center">
              <p className="mb-3 text-text-secondary">
                Full content not available in-app.
              </p>
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors"
              >
                <ExternalLink size={14} />
                Read on {article.source}
              </a>
            </div>
          )}

          {/* Reactions + Actions */}
          <div className="mt-8 border-t border-border-secondary pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <QuickReactions articleId={article.id} />
              <RemindMeButton articleId={article.id} />
            </div>

            <GoDeeper
              articleId={article.id}
              articleTitle={article.title}
              articleContent={article.content}
            />
          </div>

          {/* Key entities */}
          {article.summary?.keyEntities &&
            article.summary.keyEntities.length > 0 && (
              <div className="mt-8 border-t border-border-secondary pt-6">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Mentioned in this article
                </h4>
                <div className="flex flex-wrap gap-2">
                  {article.summary.keyEntities.map((entity, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-border-primary bg-bg-secondary px-3 py-1 text-xs font-medium text-text-secondary"
                    >
                      {entity.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>
    </>
  );
}
