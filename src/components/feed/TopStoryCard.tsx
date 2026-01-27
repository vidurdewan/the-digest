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

export function TopStoryCard({
  article,
  onOpenReader,
}: TopStoryCardProps) {
  return (
    <div
      className="group relative flex w-[260px] shrink-0 snap-start cursor-pointer flex-col rounded-2xl border border-border-secondary bg-bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:border-border-primary"
      onClick={() => onOpenReader?.(article)}
      data-feed-index
    >
      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        {/* Topic tag — uniform muted style */}
        <span className="topic-tag mb-3 inline-flex w-fit rounded-full px-2.5 py-1">
          {topicLabels[article.topic]}
        </span>

        {/* Title — serif, clear hierarchy */}
        <h4 className="mb-auto text-[15px] font-bold leading-snug text-text-primary line-clamp-3 group-hover:text-accent-primary transition-colors">
          {article.title}
        </h4>

        {/* Source + Time — bottom of card */}
        <div className="mt-4 flex items-center gap-1.5 text-xs text-text-tertiary">
          <span className="font-medium text-text-secondary">{article.source}</span>
          <span className="text-border-primary">&middot;</span>
          <Clock size={11} />
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
