"use client";

import { useEffect } from "react";
import {
  X,
  Clock,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Share2,
  Minus,
  Plus,
} from "lucide-react";
import { useState } from "react";
import type { Article, Summary } from "@/types";
import { topicLabels, getRelativeTime } from "@/lib/mock-data";

interface FullReaderViewProps {
  article: (Article & { summary?: Summary }) | null;
  onClose: () => void;
}

export function FullReaderView({ article, onClose }: FullReaderViewProps) {
  const [fontSize, setFontSize] = useState(18);
  const [isSaved, setIsSaved] = useState(article?.isSaved ?? false);

  useEffect(() => {
    if (article) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [article]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!article) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm">
      {/* Reader panel */}
      <div className="relative my-4 w-full max-w-3xl rounded-xl bg-bg-primary shadow-2xl sm:my-8">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl border-b border-border-primary bg-bg-primary/95 px-4 py-3 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text-secondary">
              {article.source}
            </span>
            <span className="text-text-tertiary">&middot;</span>
            <span className="text-sm text-text-tertiary">
              {getRelativeTime(article.publishedAt)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Font size controls */}
            <button
              onClick={() => setFontSize(Math.max(14, fontSize - 2))}
              className="rounded-md p-1.5 text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors"
              aria-label="Decrease font size"
            >
              <Minus size={16} />
            </button>
            <span className="w-8 text-center text-xs text-text-tertiary">
              {fontSize}
            </span>
            <button
              onClick={() => setFontSize(Math.min(28, fontSize + 2))}
              className="rounded-md p-1.5 text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors"
              aria-label="Increase font size"
            >
              <Plus size={16} />
            </button>
            <div className="mx-1 h-5 w-px bg-border-primary" />
            <button
              onClick={() => setIsSaved(!isSaved)}
              className="rounded-md p-1.5 text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors"
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
              className="rounded-md p-1.5 text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors"
              aria-label="Open source"
            >
              <ExternalLink size={16} />
            </a>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors"
              aria-label="Close reader"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Article content */}
        <div className="px-4 py-6 sm:px-8 sm:py-8">
          {/* Meta */}
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-accent-secondary px-2.5 py-0.5 text-xs font-medium text-accent-primary">
              {topicLabels[article.topic]}
            </span>
            <span className="flex items-center gap-1 text-xs text-text-tertiary">
              <Clock size={12} />
              {article.readingTimeMinutes} min read
            </span>
          </div>

          {/* Title */}
          <h1
            className="mb-4 font-bold leading-tight text-text-primary"
            style={{ fontSize: `${fontSize + 8}px` }}
          >
            {article.title}
          </h1>

          {/* Author & date */}
          <div className="mb-6 flex items-center gap-3 border-b border-border-secondary pb-6">
            {article.author && (
              <span className="text-sm font-medium text-text-secondary">
                By {article.author}
              </span>
            )}
            <span className="text-sm text-text-tertiary">
              {new Date(article.publishedAt).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Summary section */}
          {article.summary && (
            <div className="mb-8 space-y-4 rounded-xl border border-border-primary bg-bg-secondary p-4 sm:p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
                AI Summary
              </h3>
              <div>
                <h4 className="mb-1 text-sm font-semibold text-text-primary">
                  The News
                </h4>
                <p
                  className="leading-relaxed text-text-secondary"
                  style={{ fontSize: `${fontSize - 2}px` }}
                >
                  {article.summary.theNews}
                </p>
              </div>
              <div className="rounded-lg bg-bg-tertiary p-3">
                <h4 className="mb-1 text-sm font-semibold text-text-primary">
                  Why It Matters
                </h4>
                <p
                  className="leading-relaxed text-text-secondary"
                  style={{ fontSize: `${fontSize - 2}px` }}
                >
                  {article.summary.whyItMatters}
                </p>
              </div>
            </div>
          )}

          {/* Full article content */}
          {article.content ? (
            <div
              className="prose max-w-none leading-relaxed text-text-primary"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
            >
              {article.content.split("\n\n").map((paragraph, i) => (
                <p key={i} className="mb-4 text-text-primary">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border-primary bg-bg-secondary p-6 text-center">
              <p className="mb-3 text-text-secondary">
                Full article content is not available in-app.
              </p>
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors"
              >
                <ExternalLink size={14} />
                Read on {article.source}
              </a>
            </div>
          )}

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
    </div>
  );
}
