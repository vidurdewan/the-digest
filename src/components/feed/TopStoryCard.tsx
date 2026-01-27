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
} from "lucide-react";
import type { Article, Summary, ArticleWithIntelligence, TopicCategory, StoryType } from "@/types";
import { topicLabels, getRelativeTime } from "@/lib/mock-data";
import { ExpandedArticleView } from "@/components/articles/ExpandedArticleView";

interface TopStoryCardProps {
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

export function TopStoryCard({
  article,
  onSave,
  onOpenReader,
  onRequestSummary,
  onExpand,
}: TopStoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(article.isSaved);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
    onSave?.(article.id);
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
  const topicStyle = getTopicStyle(article.topic);

  return (
    <div
      className={`group relative rounded-xl border bg-bg-card transition-all duration-200 ${
        isExpanded
          ? "border-accent-primary/30 shadow-md"
          : "border-border-primary hover:border-accent-primary/20 hover:shadow-sm"
      }`}
      data-feed-index
    >
      {/* Main content */}
      <div className="cursor-pointer p-4" onClick={handleExpand}>
        {/* Badges */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={topicStyle}
          >
            {topicLabels[article.topic]}
          </span>
          {storyType && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${STORY_TYPE_STYLES[storyType].bg} ${STORY_TYPE_STYLES[storyType].text}`}
            >
              {STORY_TYPE_STYLES[storyType].label}
            </span>
          )}
          {article.watchlistMatches.length > 0 && (
            <Eye size={10} className="text-accent-warning" />
          )}
          {!article.isRead && (
            <span className="h-1.5 w-1.5 rounded-full bg-accent-primary" />
          )}
        </div>

        {/* Title */}
        <h4 className="mb-1.5 text-sm font-semibold leading-snug text-text-primary group-hover:text-accent-primary transition-colors line-clamp-2">
          {article.title}
        </h4>

        {/* Brief */}
        {article.summary?.brief && (
          <p className="mb-2 text-xs text-text-secondary line-clamp-2">
            {article.summary.brief}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
            <span className="font-medium text-text-secondary">{article.source}</span>
            <span>&middot;</span>
            <Clock size={10} />
            <span>{article.readingTimeMinutes}m</span>
            <span>&middot;</span>
            <span>{getRelativeTime(article.publishedAt)}</span>
          </div>
          <div className="flex items-center gap-1">
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
      </div>

      {/* Expanded intelligence view */}
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
            onOpenFull={(e: React.MouseEvent) => {
              e.stopPropagation();
              onOpenReader?.(article);
            }}
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
