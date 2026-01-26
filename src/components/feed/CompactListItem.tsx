"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck,
  Loader2,
} from "lucide-react";
import type { Article, Summary, ArticleWithIntelligence, TopicCategory } from "@/types";
import { topicLabels, getRelativeTime } from "@/lib/mock-data";
import { ExpandedArticleView } from "@/components/articles/ExpandedArticleView";

interface CompactListItemProps {
  article: ArticleWithIntelligence;
  onSave?: (id: string) => void;
  onOpenReader?: (article: Article & { summary?: Summary }) => void;
  onRequestSummary?: (
    article: Article & { summary?: Summary }
  ) => Promise<Summary | null>;
  onExpand?: (articleId: string) => void;
}

export function CompactListItem({
  article,
  onSave,
  onOpenReader,
  onRequestSummary,
  onExpand,
}: CompactListItemProps) {
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

      if (!article.summary?.theNews && onRequestSummary) {
        setIsLoadingSummary(true);
        await onRequestSummary(article);
        setIsLoadingSummary(false);
      }
    }
  };

  const topicStyle = getTopicStyle(article.topic);

  return (
    <div
      className={`group rounded-lg border transition-all duration-150 ${
        isExpanded
          ? "border-accent-primary/30 bg-bg-card shadow-sm"
          : "border-border-primary bg-bg-card hover:border-accent-primary/15"
      } ${article.isRead ? "opacity-70" : ""}`}
      data-feed-index
    >
      {/* Compact row */}
      <div
        className="flex cursor-pointer items-center gap-3 px-3 py-2.5"
        onClick={handleExpand}
      >
        {/* Topic dot */}
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: topicStyle.color }}
        />

        {/* Title */}
        <h4 className="flex-1 truncate text-sm font-medium text-text-primary group-hover:text-accent-primary transition-colors">
          {article.title}
        </h4>

        {/* Source */}
        <span className="hidden shrink-0 text-xs text-text-tertiary sm:inline">
          {article.source}
        </span>

        {/* Time */}
        <span className="shrink-0 text-xs text-text-tertiary">
          {getRelativeTime(article.publishedAt)}
        </span>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={handleSave}
            className="rounded p-0.5 text-text-tertiary hover:text-accent-primary transition-colors opacity-0 group-hover:opacity-100"
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
            className="rounded p-0.5 text-text-tertiary hover:text-accent-primary transition-colors"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && isLoadingSummary && (
        <div className="border-t border-border-secondary px-4 py-4">
          <div className="flex items-center gap-3 text-text-tertiary">
            <Loader2 size={14} className="animate-spin" />
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
            intelligence={article.intelligence}
            articleTitle={article.title}
            articleContent={article.content}
          />
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
