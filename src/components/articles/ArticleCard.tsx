"use client";

import { useState } from "react";
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck,
  Check,
  ExternalLink,
  Share2,
  Eye,
  Loader2,
} from "lucide-react";
import { useToastStore } from "@/components/ui/Toast";
import type { Article, Summary } from "@/types";
import { topicLabels, getRelativeTime } from "@/lib/mock-data";
import { ExpandedArticleView } from "./ExpandedArticleView";

function cleanAuthor(author: string): string {
  const parenMatch = author.match(/\(([^)]+)\)/);
  if (parenMatch) return parenMatch[1];
  if (author.includes("@") && !author.includes(" ")) {
    const prefix = author.split("@")[0];
    return prefix.split(/[._-]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  return author;
}

interface ArticleCardProps {
  article: Article & { summary?: Summary };
  onSave?: (id: string) => void;
  onOpenReader?: (article: Article & { summary?: Summary }) => void;
  onRequestSummary?: (
    article: Article & { summary?: Summary }
  ) => Promise<Summary | null>;
  onExpand?: (articleId: string) => void;
  hideTopic?: boolean;
}

export function ArticleCard({
  article,
  onSave,
  onOpenReader,
  onRequestSummary,
  onExpand,
  hideTopic = false,
}: ArticleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(article.isSaved);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [saveAnimating, setSaveAnimating] = useState(false);
  const [showCheckOverlay, setShowCheckOverlay] = useState(false);
  const [dotFading, setDotFading] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const markAsRead = () => {
    if (!article.isRead && !hasBeenOpened) {
      setDotFading(true);
      setHasBeenOpened(true);
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const willSave = !isSaved;
    setIsSaved(willSave);
    setSaveAnimating(true);
    setTimeout(() => setSaveAnimating(false), 200);

    if (willSave) {
      setShowCheckOverlay(true);
      setTimeout(() => setShowCheckOverlay(false), 500);
      addToast("Saved to library", "success");
    } else {
      addToast("Removed from library", "info");
    }

    onSave?.(article.id);
  };

  const handleOpenReader = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead();
    onOpenReader?.(article);
  };

  const handleExpand = async () => {
    const willExpand = !isExpanded;
    setIsExpanded(willExpand);

    if (willExpand) {
      markAsRead();
      onExpand?.(article.id);

      // If expanding and no full summary yet, request one
      if (!article.summary?.theNews && onRequestSummary) {
        setIsLoadingSummary(true);
        await onRequestSummary(article);
        setIsLoadingSummary(false);
      }
    }
  };

  return (
    <div
      className={`group rounded-2xl border bg-bg-card transition-all duration-200 ${
        isExpanded
          ? "border-border-primary shadow-md"
          : "border-border-secondary hover:border-border-primary hover:shadow-sm"
      } ${article.isRead ? "opacity-70" : ""}`}
    >
      {/* Level 1: Headline */}
      <div
        className="cursor-pointer p-4 sm:p-5"
        onClick={handleExpand}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {!hideTopic && (
            <span
              className="topic-tag rounded-full px-2.5 py-0.5"
              data-topic={article.topic}
            >
              {topicLabels[article.topic]}
            </span>
          )}
          {article.watchlistMatches.length > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-accent-warning/15 px-2 py-0.5 text-xs font-medium text-accent-warning">
              <Eye size={10} />
              Watchlist
            </span>
          )}
          {!article.isRead && (
            <span className={`h-2 w-2 rounded-full bg-accent-primary unread-dot ${dotFading ? "unread-dot-fade" : ""}`} />
          )}
          <span className="ml-auto flex items-center gap-1 text-xs text-text-tertiary">
            <Clock size={12} />
            {article.readingTimeMinutes} min read
          </span>
        </div>

        <h3 className={`article-title-read-state mb-1.5 text-base font-semibold leading-snug transition-colors group-hover:text-accent-primary sm:text-lg ${hasBeenOpened || article.isRead ? "text-text-secondary" : "text-text-primary"}`}>
          {article.title}
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-secondary">
              {article.source}
            </span>
            {article.author && (
              <>
                <span className="text-text-tertiary">&middot;</span>
                <span className="text-xs text-text-tertiary">
                  {cleanAuthor(article.author)}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-tertiary">
              {getRelativeTime(article.publishedAt)}
            </span>
            <button
              onClick={handleSave}
              className="relative rounded-md p-1 text-text-tertiary hover:text-accent-primary transition-colors"
              aria-label={isSaved ? "Unsave article" : "Save article"}
            >
              <span className={saveAnimating ? "save-button-pop" : ""}>
                {isSaved ? (
                  <BookmarkCheck size={16} className="text-accent-primary" />
                ) : (
                  <Bookmark size={16} />
                )}
              </span>
              {showCheckOverlay && (
                <span className="save-check-overlay absolute inset-0 flex items-center justify-center">
                  <Check size={12} className="text-accent-success" />
                </span>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleExpand();
              }}
              className="rounded-md p-1 text-text-tertiary hover:text-accent-primary transition-colors"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Level 2: Summary + Impact (expand in place) */}
      {isExpanded && isLoadingSummary && (
        <div className="border-t border-border-secondary px-4 py-6 sm:px-5">
          <div className="flex items-center gap-3 text-text-tertiary">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Generating AI summary...</span>
          </div>
        </div>
      )}
      {isExpanded && !isLoadingSummary && article.summary && (
        <div className="border-t border-border-secondary">
          <ExpandedArticleView
            summary={article.summary}
            onOpenFull={handleOpenReader}
            sourceUrl={article.sourceUrl}
            articleId={article.id}
            articleTitle={article.title}
            articleContent={article.content}
          />
        </div>
      )}

      {/* Brief teaser if summary but not expanded */}
      {!isExpanded && article.summary && (
        <div className="border-t border-border-secondary px-4 py-3 sm:px-5">
          <p className="text-sm text-text-secondary line-clamp-2">
            {article.summary.brief}
          </p>
        </div>
      )}
    </div>
  );
}

