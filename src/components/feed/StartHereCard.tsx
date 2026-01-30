"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Eye,
  Loader2,
  Tag,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import type { Article, Summary, ArticleIntelligence, ArticleWithIntelligence, TopicCategory, Entity, StoryType } from "@/types";
import { topicLabels, getRelativeTime } from "@/lib/mock-data";
import { AnnotationsPanel } from "@/components/articles/AnnotationsPanel";
import { QuickReactions } from "@/components/intelligence/QuickReactions";
import { GoDeeper } from "@/components/intelligence/GoDeeper";
import { RemindMeButton } from "@/components/intelligence/RemindMeButton";

interface StartHereCardProps {
  article: ArticleWithIntelligence;
  rank: number;
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

export function StartHereCard({
  article,
  rank,
  onSave,
  onOpenReader,
  onRequestSummary,
  onExpand,
}: StartHereCardProps) {
  const [isSaved, setIsSaved] = useState(article.isSaved);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Auto-request full summary on mount if missing
  useEffect(() => {
    if (!article.summary?.theNews && onRequestSummary && !isLoadingSummary) {
      setIsLoadingSummary(true);
      onRequestSummary(article).finally(() => setIsLoadingSummary(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id]);

  useEffect(() => {
    if (article.summary?.theNews) {
      onExpand?.(article.id);
    }
  }, [article.summary?.theNews, article.id, onExpand]);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
    onSave?.(article.id);
  };

  const handleOpenReader = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenReader?.(article);
  };

  const intelligence = article.intelligence;
  const storyType = intelligence?.storyType;
  const significance = intelligence?.significanceScore || 5;
  const topicStyle = getTopicStyle(article.topic);

  return (
    <div
      className="group relative rounded-xl border-2 border-accent-primary/20 bg-bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:border-accent-primary/40"
      data-feed-index={rank - 1}
    >
      {/* Significance bar — left edge color indicator */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{
          backgroundColor: getSignificanceColor(significance),
          opacity: 0.8 + (significance / 10) * 0.2,
        }}
      />

      {/* Card header */}
      <div className="px-5 pt-4 pb-2 pl-7">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {/* Rank number */}
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-primary text-xs font-bold text-text-inverse">
            {rank}
          </span>

          {/* Topic badge */}
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={topicStyle}
          >
            {topicLabels[article.topic]}
          </span>

          {/* Story type badge */}
          {storyType && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STORY_TYPE_STYLES[storyType].bg} ${STORY_TYPE_STYLES[storyType].text}`}
            >
              {STORY_TYPE_STYLES[storyType].label}
            </span>
          )}

          {/* Watchlist indicator */}
          {article.watchlistMatches.length > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-accent-warning/15 px-2 py-0.5 text-xs font-medium text-accent-warning">
              <Eye size={10} />
              Watchlist
            </span>
          )}

          {/* Significance dots */}
          <div className="ml-auto flex items-center gap-1">
            <TrendingUp size={12} className="text-text-tertiary" />
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: i < significance
                      ? getSignificanceColor(significance)
                      : "var(--border-primary)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Title */}
        <h3
          className="mb-1 text-lg font-bold leading-snug text-text-primary cursor-pointer hover:text-accent-primary transition-colors"
          onClick={handleOpenReader}
        >
          {article.title}
        </h3>

        {/* Source / meta */}
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <span className="font-medium text-text-secondary">{article.source}</span>
          {article.author && (
            <>
              <span>&middot;</span>
              <span>{article.author}</span>
            </>
          )}
          <span>&middot;</span>
          <Clock size={11} />
          <span>{article.readingTimeMinutes} min</span>
          <span>&middot;</span>
          <span>{getRelativeTime(article.publishedAt)}</span>
        </div>
      </div>

      {/* Full AI Summary — always visible for Start Here cards */}
      <div className="px-5 pb-4 pl-7 space-y-3">
        {isLoadingSummary && (
          <div className="flex items-center gap-3 py-4 text-text-tertiary">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Generating AI summary...</span>
          </div>
        )}

        {!isLoadingSummary && article.summary?.theNews && (
          <>
            {/* The News */}
            <div>
              <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text-primary">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-primary" />
                The News
              </h4>
              <p className="text-sm leading-relaxed text-text-secondary">
                {article.summary.theNews}
              </p>
            </div>

            {/* Why It Matters */}
            <div className="rounded-lg bg-bg-secondary p-3">
              <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text-primary">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-warning" />
                Why It Matters
              </h4>
              <p className="text-sm leading-relaxed text-text-secondary">
                {article.summary.whyItMatters}
              </p>
            </div>

            {/* The Context */}
            {article.summary.theContext && (
              <div>
                <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-success" />
                  The Context
                </h4>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {article.summary.theContext}
                </p>
              </div>
            )}

            {/* Watch for next */}
            {intelligence?.watchForNext && (
              <div className="flex items-start gap-2 rounded-lg border border-border-secondary bg-bg-secondary/50 px-3 py-2">
                <ArrowRight size={14} className="mt-0.5 shrink-0 text-accent-primary" />
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent-primary">
                    Watch for next
                  </span>
                  <p className="text-sm text-text-secondary">
                    {intelligence.watchForNext}
                  </p>
                </div>
              </div>
            )}

            {/* Key Entities */}
            {article.summary.keyEntities.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  <Tag size={12} />
                  Key Entities
                </h4>
                <div className="flex flex-wrap gap-2">
                  {article.summary.keyEntities.map((entity, i) => (
                    <EntityTag key={i} entity={entity} />
                  ))}
                </div>
              </div>
            )}

            {/* Connections */}
            {intelligence?.connectsTo && intelligence.connectsTo.length > 0 && (
              <div className="rounded-lg border border-border-secondary bg-bg-secondary/30 px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  This connects to...
                </span>
                <div className="mt-1 space-y-1">
                  {intelligence.connectsTo.map((conn, i) => (
                    <p key={i} className="text-sm text-text-secondary">
                      <span className="font-medium text-text-primary">{conn.articleTitle}</span>
                      {" — "}{conn.reason}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Reactions + Remind Me */}
            <div className="flex items-center justify-between">
              <QuickReactions articleId={article.id} />
              <RemindMeButton articleId={article.id} />
            </div>

            {/* Go Deeper / Explain This */}
            <GoDeeper
              articleId={article.id}
              articleTitle={article.title}
              articleContent={article.content}
            />

            {/* Annotations */}
            <div className="border-t border-border-secondary pt-3">
              <AnnotationsPanel articleId={article.id} />
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border-secondary pt-3">
          <button
            onClick={handleOpenReader}
            className="flex items-center gap-1.5 rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors"
          >
            Read Full Article
          </button>
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-border-primary px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors"
          >
            <ExternalLink size={14} />
            Open Source
          </a>
          <div className="ml-auto">
            <button
              onClick={handleSave}
              className="rounded-md p-1.5 text-text-tertiary hover:text-accent-primary transition-colors"
              aria-label={isSaved ? "Unsave" : "Save"}
            >
              {isSaved ? (
                <BookmarkCheck size={18} className="text-accent-primary" />
              ) : (
                <Bookmark size={18} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EntityTag({ entity }: { entity: Entity }) {
  const entityKey = (["company", "person", "fund", "keyword"].includes(entity.type) ? entity.type : "keyword");
  const style = {
    border: `var(--entity-${entityKey}-border)`,
    text: `var(--entity-${entityKey}-text)`,
  };

  return (
    <button
      className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80"
      style={{ borderColor: style.border, color: style.text }}
    >
      <span className="text-[10px] uppercase opacity-60">{entity.type}</span>
      <span>{entity.name}</span>
    </button>
  );
}

function getTopicStyle(topic: TopicCategory): React.CSSProperties {
  const varMap: Record<TopicCategory, string> = {
    "vc-startups": "vc",
    "fundraising-acquisitions": "fundraising",
    "executive-movements": "executive",
    "financial-markets": "financial",
    geopolitics: "geopolitics",
    automotive: "automotive",
    "science-tech": "science",
    "local-news": "local",
    politics: "politics",
  };
  const key = varMap[topic] || "fallback";
  return {
    backgroundColor: `var(--topic-badge-${key}-bg)`,
    color: `var(--topic-badge-${key}-text)`,
  };
}

function getSignificanceColor(score: number): string {
  if (score >= 8) return "var(--significance-high)";
  if (score >= 6) return "var(--significance-medium)";
  if (score >= 4) return "var(--significance-low)";
  return "var(--significance-none)";
}
