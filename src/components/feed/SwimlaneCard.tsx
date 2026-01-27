"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import type { Article, Summary, ArticleWithIntelligence, TopicCategory } from "@/types";
import { getRelativeTime } from "@/lib/mock-data";

interface SwimlaneCardProps {
  article: ArticleWithIntelligence;
  onSave?: (id: string) => void;
  onOpenReader?: (article: Article & { summary?: Summary }) => void;
}

export function SwimlaneCard({
  article,
  onSave,
  onOpenReader,
}: SwimlaneCardProps) {
  const [isSaved, setIsSaved] = useState(article.isSaved);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
    onSave?.(article.id);
  };

  return (
    <div
      className="group relative w-[280px] shrink-0 snap-start cursor-pointer rounded-xl border border-border-primary bg-bg-card transition-all duration-150 hover:border-accent-primary/20 hover:shadow-sm"
      onClick={() => onOpenReader?.(article)}
    >
      {/* Image thumbnail */}
      {article.imageUrl && (
        <div className="h-32 w-full overflow-hidden rounded-t-xl bg-bg-secondary">
          <img
            src={article.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}

      <div className="p-3.5">
        {/* Title */}
        <h4 className="mb-2 text-sm font-semibold leading-snug text-text-primary line-clamp-2 group-hover:text-accent-primary transition-colors">
          {article.title}
        </h4>

        {/* Brief preview */}
        {article.summary?.brief && (
          <p className="mb-2.5 text-xs text-text-tertiary line-clamp-2">
            {article.summary.brief}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
            <span className="font-medium text-text-secondary">{article.source}</span>
            <span>&middot;</span>
            <span>{getRelativeTime(article.publishedAt)}</span>
          </div>

          {/* Save — visible on hover */}
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
        </div>
      </div>

      {/* Unread dot */}
      {!article.isRead && (
        <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-accent-primary" />
      )}
    </div>
  );
}
