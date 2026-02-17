"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Clock } from "lucide-react";
import type { Article, Summary, ArticleWithIntelligence } from "@/types";
import { getRelativeTime } from "@/lib/mock-data";
import { SignalBadges } from "@/components/intelligence/SignalBadge";
import { TopicGradient, SourceBadge } from "@/components/feed/CardVisuals";

interface SwimlaneCardProps {
  article: ArticleWithIntelligence;
  onSave?: (id: string) => void;
  onOpenReader?: (article: Article & { summary?: Summary }) => void;
}

export function SwimlaneCard({
  article,
  onOpenReader,
}: SwimlaneCardProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = article.imageUrl && !imgError;

  return (
    <div
      className="card-interactive group relative w-full cursor-pointer overflow-hidden rounded-2xl border border-border-secondary bg-bg-card"
      onClick={() => onOpenReader?.(article)}
    >
      {/* Thumbnail or topic gradient fallback */}
      <div className="relative h-[80px] w-full overflow-hidden bg-bg-secondary">
        {showImage ? (
          <img
            src={article.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <TopicGradient topic={article.topic} size="sm" />
        )}
      </div>

      <div className="p-3.5">
        {/* Signal badges — compact */}
        {article.signals && article.signals.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            <SignalBadges signals={article.signals} compact max={1} />
          </div>
        )}

        {/* Title */}
        <h4 className="mb-2 text-sm font-semibold leading-snug text-text-primary line-clamp-2 group-hover:text-accent-primary transition-colors">
          {article.title}
        </h4>

        {/* Source + Time */}
        <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
          <SourceBadge source={article.source} sourceUrl={article.sourceUrl} />
          <span className="text-border-primary">&middot;</span>
          <Clock size={10} />
          <span>{getRelativeTime(article.publishedAt)}</span>
        </div>
      </div>

      {/* Unread dot */}
      {!article.isRead && (
        <div className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-accent-primary ring-2 ring-white/60" />
      )}
    </div>
  );
}
