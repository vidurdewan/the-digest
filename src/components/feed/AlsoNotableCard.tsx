"use client";

import { useState } from "react";
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck,
  Eye,
  Loader2,
  TrendingUp,
} from "lucide-react";
import type { Article, Summary, ArticleWithIntelligence, TopicCategory, StoryType } from "@/types";
import { topicLabels, getRelativeTime } from "@/lib/mock-data";
import { ExpandedArticleView } from "@/components/articles/ExpandedArticleView";

interface AlsoNotableCardProps {
  article: ArticleWithIntelligence;
  onSave?: (id: string) => void;
  onOpenReader?: (article: Article & { summary?: Summary }) => void;
  onRequestSummary?: (
    article: Article & { summary?: Summary }
  ) => Promise<Summary | null>;
  onExpand?: (articleId: string) => void;
}

const STORY_TYPE_STYLES: Record<StoryType, { bg: string; text: string; label: string }> = {
  breaking: { bg: "bg-red-100", text: "text-red-700", label: "Breaking" },
  developing: { bg: "bg-orange-100", text: "text-orange-700", label: "Developing" },
  analysis: { bg: "bg-blue-100", text: "text-blue-700", label: "Analysis" },
  opinion: { bg: "bg-purple-100", text: "text-purple-700", label: "Opinion" },
  feature: { bg: "bg-green-100", text: "text-green-700", label: "Feature" },
  update: { bg: "bg-gray-100", text: "text-gray-600", label: "Update" },
};

export function AlsoNotableCard({
  article,
  onSave,
  onOpenReader,
  onRequestSummary,
  onExpand,
}: AlsoNotableCardProps) {
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

  const intelligence = article.intelligence;
  const storyType = intelligence?.storyType;
  const significance = intelligence?.significanceScore || 5;
  const topicStyle = getTopicStyle(article.topic);

  return (
    <div
      className={`group relative rounded-xl border bg-bg-card transition-all duration-200 ${
        isExpanded
          ? "border-accent-primary/30 shadow-md"
          : "border-border-primary hover:border-accent-primary/20 hover:shadow-sm"
      } ${article.isRead ? "opacity-75" : ""}`}
      data-feed-index
    >
      {/* Significance bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl"
        style={{
          backgroundColor: getSignificanceColor(significance),
          opacity: 0.6 + (significance / 10) * 0.4,
        }}
      />

      {/* Headline area */}
      <div className="cursor-pointer p-4 pl-5 sm:p-5 sm:pl-6" onClick={handleExpand}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={topicStyle}
          >
            {topicLabels[article.topic]}
          </span>

          {storyType && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STORY_TYPE_STYLES[storyType].bg} ${STORY_TYPE_STYLES[storyType].text}`}
            >
              {STORY_TYPE_STYLES[storyType].label}
            </span>
          )}

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
            {article.readingTimeMinutes} min
          </span>
        </div>

        <h3 className="mb-1.5 text-base font-semibold leading-snug text-text-primary transition-colors group-hover:text-accent-primary">
          {article.title}
        </h3>

        {/* 2-sentence brief summary — always visible */}
        {article.summary?.brief && (
          <p className="mb-2 text-sm text-text-secondary line-clamp-2">
            {article.summary.brief}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-secondary">
              {article.source}
            </span>
            {article.author && (
              <>
                <span className="text-text-tertiary">&middot;</span>
                <span className="text-xs text-text-tertiary">{article.author}</span>
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
              aria-label={isSaved ? "Unsave" : "Save"}
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

      {/* Expanded view */}
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

function getSignificanceColor(score: number): string {
  if (score >= 8) return "#dc2626";
  if (score >= 6) return "#f59e0b";
  if (score >= 4) return "#3b82f6";
  return "#9ca3af";
}
