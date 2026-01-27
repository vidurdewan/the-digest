"use client";

import { Clock } from "lucide-react";
import type { Article, Summary, ArticleWithIntelligence } from "@/types";
import { getRelativeTime } from "@/lib/mock-data";

interface SwimlaneCardProps {
  article: ArticleWithIntelligence;
  onSave?: (id: string) => void;
  onOpenReader?: (article: Article & { summary?: Summary }) => void;
}

export function SwimlaneCard({
  article,
  onOpenReader,
}: SwimlaneCardProps) {
  return (
    <div
      className="group relative w-[240px] shrink-0 snap-start cursor-pointer rounded-2xl border border-border-secondary bg-bg-card p-4 transition-all duration-150 hover:shadow-sm hover:border-border-primary"
      onClick={() => onOpenReader?.(article)}
    >
      {/* Title */}
      <h4 className="mb-3 text-sm font-semibold leading-snug text-text-primary line-clamp-2 group-hover:text-accent-primary transition-colors">
        {article.title}
      </h4>

      {/* Brief preview */}
      {article.summary?.brief && (
        <p className="mb-3 text-xs leading-relaxed text-text-tertiary line-clamp-2">
          {article.summary.brief}
        </p>
      )}

      {/* Source + Time */}
      <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
        <span className="font-medium text-text-secondary">{article.source}</span>
        <span className="text-border-primary">&middot;</span>
        <Clock size={10} />
        <span>{getRelativeTime(article.publishedAt)}</span>
      </div>

      {/* Unread dot */}
      {!article.isRead && (
        <div className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-accent-primary" />
      )}
    </div>
  );
}
