"use client";

import { useState, useMemo } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck,
  Clock,
  Loader2,
  ExternalLink,
} from "lucide-react";
import type { Article, Summary, ArticleWithIntelligence } from "@/types";
import { topicLabels, getRelativeTime } from "@/lib/mock-data";
import { ExpandedArticleView } from "@/components/articles/ExpandedArticleView";

interface SurpriseMeProps {
  articles: ArticleWithIntelligence[];
  onSave?: (id: string) => void;
  onOpenReader?: (article: Article & { summary?: Summary }) => void;
  onRequestSummary?: (
    article: Article & { summary?: Summary }
  ) => Promise<Summary | null>;
  onExpand?: (articleId: string) => void;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDismissedToday(): boolean {
  if (typeof window === "undefined") return false;
  const dismissed = localStorage.getItem("the-digest-surprise-dismissed");
  return dismissed === getTodayKey();
}

function setDismissedToday(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("the-digest-surprise-dismissed", getTodayKey());
}

function getSurpriseArticleId(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("the-digest-surprise-article");
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (parsed.date === getTodayKey()) return parsed.id;
  } catch {
    // ignore
  }
  return null;
}

function setSurpriseArticleId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    "the-digest-surprise-article",
    JSON.stringify({ date: getTodayKey(), id })
  );
}

export function SurpriseMe({
  articles,
  onSave,
  onOpenReader,
  onRequestSummary,
  onExpand,
}: SurpriseMeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(getDismissedToday);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Select today's surprise article
  const surpriseArticle = useMemo(() => {
    // Check for surprise candidates first
    const candidates = articles.filter(
      (a) => a.intelligence?.isSurpriseCandidate
    );

    const pool = candidates.length > 0 ? candidates : articles.slice(-10);
    if (pool.length === 0) return null;

    // Check if we already picked one today
    const storedId = getSurpriseArticleId();
    if (storedId) {
      const found = pool.find((a) => a.id === storedId);
      if (found) return found;
    }

    // Pick a deterministic "random" one based on today's date
    const dateHash = getTodayKey()
      .split("")
      .reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const picked = pool[dateHash % pool.length];
    setSurpriseArticleId(picked.id);
    return picked;
  }, [articles]);

  if (!surpriseArticle || isDismissed) return null;

  const handleDismiss = () => {
    setDismissedToday();
    setIsDismissed(true);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
    onSave?.(surpriseArticle.id);
  };

  const handleExpand = async () => {
    const willExpand = !isExpanded;
    setIsExpanded(willExpand);

    if (willExpand) {
      onExpand?.(surpriseArticle.id);

      if (!surpriseArticle.summary?.theNews && onRequestSummary) {
        setIsLoadingSummary(true);
        await onRequestSummary(surpriseArticle);
        setIsLoadingSummary(false);
      }
    }
  };

  const handleOpenReader = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenReader?.(surpriseArticle);
  };

  return (
    <div className="relative rounded-2xl border border-border-secondary bg-gradient-to-br from-accent-primary/[0.04] via-transparent to-accent-primary/[0.02] p-4 sm:p-5">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-3 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
      >
        Dismiss
      </button>

      {/* Header */}
      <div className="mb-3 flex items-center gap-1.5">
        <Sparkles size={14} className="text-accent-primary" />
        <span className="text-xs font-semibold text-accent-primary">
          Something Different
        </span>
      </div>

      {/* Article preview */}
      <div className="cursor-pointer" onClick={handleExpand}>
        <div className="mb-1.5 flex items-center gap-2">
          <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-xs font-medium text-text-secondary">
            {topicLabels[surpriseArticle.topic]}
          </span>
          <span className="flex items-center gap-1 text-xs text-text-tertiary">
            <Clock size={11} />
            {surpriseArticle.readingTimeMinutes} min
          </span>
        </div>

        <h4 className="mb-1 text-base font-semibold text-text-primary hover:text-accent-primary transition-colors">
          {surpriseArticle.title}
        </h4>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <span className="font-medium text-text-secondary">
              {surpriseArticle.source}
            </span>
            <span>&middot;</span>
            <span>{getRelativeTime(surpriseArticle.publishedAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSave}
              className="rounded-md p-1 text-text-tertiary hover:text-accent-primary transition-colors"
              aria-label={isSaved ? "Unsave" : "Save"}
            >
              {isSaved ? (
                <BookmarkCheck size={14} className="text-accent-primary" />
              ) : (
                <Bookmark size={14} />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleExpand();
              }}
              className="rounded-md p-1 text-text-tertiary hover:text-accent-primary transition-colors"
            >
              {isExpanded ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && isLoadingSummary && (
        <div className="mt-3 border-t border-border-secondary pt-4">
          <div className="flex items-center gap-3 text-text-tertiary">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-sm">Generating AI summary...</span>
          </div>
        </div>
      )}
      {isExpanded && !isLoadingSummary && surpriseArticle.summary && (
        <div className="mt-3 border-t border-border-secondary">
          <ExpandedArticleView
            summary={surpriseArticle.summary}
            onOpenFull={handleOpenReader}
            sourceUrl={surpriseArticle.sourceUrl}
            articleId={surpriseArticle.id}
            intelligence={surpriseArticle.intelligence}
            signals={surpriseArticle.signals}
            articleTitle={surpriseArticle.title}
            articleContent={surpriseArticle.content}
          />
        </div>
      )}
    </div>
  );
}
