"use client";

import { Clock } from "lucide-react";
import type { Article, Summary, ArticleWithIntelligence } from "@/types";
import { topicLabels, getRelativeTime } from "@/lib/mock-data";

interface TopStoryCardProps {
  article: ArticleWithIntelligence;
  onSave?: (id: string) => void;
  onOpenReader?: (article: Article & { summary?: Summary }) => void;
  onRequestSummary?: (
    article: Article & { summary?: Summary }
  ) => Promise<Summary | null>;
  onExpand?: (articleId: string) => void;
}

function getStoryBorderClass(article: ArticleWithIntelligence): string {
  const storyType = article.intelligence?.storyType;
  if (!storyType) return "";
  const map: Record<string, string> = {
    breaking: "story-border-breaking",
    developing: "story-border-developing",
    analysis: "story-border-analysis",
    opinion: "story-border-opinion",
    feature: "story-border-feature",
    update: "story-border-update",
  };
  return map[storyType] || "";
}

export function TopStoryCard({
  article,
  onOpenReader,
}: TopStoryCardProps) {
  const borderClass = getStoryBorderClass(article);

  return (
    <div
      className={`card-interactive group relative flex h-[200px] w-[260px] shrink-0 snap-start cursor-pointer flex-col rounded-2xl border border-border-secondary bg-bg-card shadow-sm ${borderClass}`}
      onClick={() => onOpenReader?.(article)}
      data-feed-index
    >
      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        {/* Topic tag — distinct color per topic */}
        <span
          className="topic-tag mb-3 inline-flex w-fit rounded-full px-2.5 py-1"
          data-topic={article.topic}
        >
          {topicLabels[article.topic]}
        </span>

        {/* Title — serif, clear hierarchy */}
        <h4 className="mb-auto text-[15px] font-bold leading-snug text-text-primary line-clamp-3 group-hover:text-accent-primary transition-colors">
          {article.title}
        </h4>

        {/* Source + Time — bottom of card */}
        <div className="mt-4 flex items-center gap-1.5 text-[11px] text-text-tertiary">
          <span className="font-medium text-text-secondary">{article.source}</span>
          <span className="text-border-primary">&middot;</span>
          <Clock size={10} />
          <span>{getRelativeTime(article.publishedAt)}</span>
        </div>
      </div>

      {/* Unread indicator */}
      {!article.isRead && (
        <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-accent-primary" />
      )}
    </div>
  );
}
