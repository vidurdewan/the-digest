"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Clock } from "lucide-react";
import type { Article, Summary, ArticleWithIntelligence } from "@/types";
import { topicLabels, getRelativeTime } from "@/lib/mock-data";
import { SignalBadges } from "@/components/intelligence/SignalBadge";
import { TopicGradient, SourceBadge } from "@/components/feed/CardVisuals";

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

function getSignificanceGlow(score: number): string {
  if (score >= 8) return "significance-glow-high";
  if (score >= 6) return "significance-glow-medium";
  return "";
}

export function TopStoryCard({
  article,
  onOpenReader,
}: TopStoryCardProps) {
  const [imgError, setImgError] = useState(false);
  const borderClass = getStoryBorderClass(article);
  const showImage = article.imageUrl && !imgError;
  const significance = article.intelligence?.significanceScore || 5;
  const glowClass = getSignificanceGlow(significance);

  return (
    <div
      className={`card-interactive group relative flex w-[280px] shrink-0 snap-start cursor-pointer flex-col overflow-hidden rounded-2xl border border-border-secondary bg-bg-card ${borderClass} ${glowClass}`}
      onClick={() => onOpenReader?.(article)}
      data-feed-index
    >
      {/* Image or topic gradient fallback */}
      <div className="relative h-[120px] w-full shrink-0 overflow-hidden bg-bg-secondary">
        {showImage ? (
          <img
            src={article.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <TopicGradient topic={article.topic} />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* Topic tag — overlaid bottom-left */}
        <span
          className="topic-tag absolute bottom-2 left-3 rounded-full px-2 py-0.5 text-[10px] backdrop-blur-sm"
          data-topic={article.topic}
        >
          {topicLabels[article.topic]}
        </span>

        {/* Unread indicator */}
        {!article.isRead && (
          <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-accent-primary ring-2 ring-white/80" />
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Signal badges — compact */}
        {article.signals && article.signals.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            <SignalBadges signals={article.signals} compact max={1} />
          </div>
        )}

        {/* Title */}
        <h4 className="mb-auto text-[14px] font-bold leading-snug text-text-primary line-clamp-2 group-hover:text-accent-primary transition-colors">
          {article.title}
        </h4>

        {/* Source + Time */}
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-text-tertiary">
          <SourceBadge source={article.source} sourceUrl={article.sourceUrl} />
          <span className="text-border-primary">&middot;</span>
          <Clock size={10} />
          <span>{getRelativeTime(article.publishedAt)}</span>
        </div>
      </div>
    </div>
  );
}
