"use client";

import { useState } from "react";
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Share2,
  Eye,
  Loader2,
} from "lucide-react";
import type { Article, Summary, TopicCategory } from "@/types";
import { topicLabels, topicColors, getRelativeTime } from "@/lib/mock-data";
import { ExpandedArticleView } from "./ExpandedArticleView";

interface ArticleCardProps {
  article: Article & { summary?: Summary };
  onSave?: (id: string) => void;
  onOpenReader?: (article: Article & { summary?: Summary }) => void;
  onRequestSummary?: (
    article: Article & { summary?: Summary }
  ) => Promise<Summary | null>;
  onExpand?: (articleId: string) => void;
}

export function ArticleCard({
  article,
  onSave,
  onOpenReader,
  onRequestSummary,
  onExpand,
}: ArticleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(article.isSaved);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
    onSave?.(article.id);
  };

  const handleOpenReader = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenReader?.(article);
  };

  const handleExpand = async () => {
    const willExpand = !isExpanded;
    setIsExpanded(willExpand);

    if (willExpand) {
      onExpand?.(article.id);

      // If expanding and no full summary yet, request one
      if (!article.summary?.theNews && onRequestSummary) {
        setIsLoadingSummary(true);
        await onRequestSummary(article);
        setIsLoadingSummary(false);
      }
    }
  };

  // Theme-safe topic colors using CSS variables
  const topicStyle = getTopicStyle(article.topic);

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
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={topicStyle}
          >
            {topicLabels[article.topic]}
          </span>
          {article.watchlistMatches.length > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-accent-warning/15 px-2 py-0.5 text-xs font-medium text-accent-warning">
              <Eye size={10} />
              Watchlist
            </span>
          )}
          {!article.isRead && (
            <span className="h-2 w-2 rounded-full bg-accent-primary" />
          )}
          <span className="ml-auto flex items-center gap-1 text-xs text-text-tertiary">
            <Clock size={12} />
            {article.readingTimeMinutes} min read
          </span>
        </div>

        <h3 className="mb-1.5 text-base font-semibold leading-snug text-text-primary transition-colors group-hover:text-accent-primary sm:text-lg">
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
                  {article.author}
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
              className="rounded-md p-1 text-text-tertiary hover:text-accent-primary transition-colors"
              aria-label={isSaved ? "Unsave article" : "Save article"}
            >
              {isSaved ? (
                <BookmarkCheck size={16} className="text-accent-primary" />
              ) : (
                <Bookmark size={16} />
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

function getTopicStyle(topic: TopicCategory): React.CSSProperties {
  const colors: Record<TopicCategory, { bg: string; text: string }> = {
    "vc-startups": { bg: "#dbeafe", text: "#1e40af" },
    "fundraising-acquisitions": { bg: "#d1fae5", text: "#065f46" },
    "executive-movements": { bg: "#ede9fe", text: "#5b21b6" },
    "financial-markets": { bg: "#fef3c7", text: "#92400e" },
    geopolitics: { bg: "#fee2e2", text: "#991b1b" },
    automotive: { bg: "#cffafe", text: "#155e75" },
    "science-tech": { bg: "#e0e7ff", text: "#3730a3" },
    "local-news": { bg: "#ffedd5", text: "#9a3412" },
    politics: { bg: "#fce7f3", text: "#9d174d" },
  };
  const c = colors[topic] || { bg: "#f3f4f6", text: "#374151" };
  return { backgroundColor: c.bg, color: c.text };
}
