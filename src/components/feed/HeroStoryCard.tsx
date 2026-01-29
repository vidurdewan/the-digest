"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  Bookmark,
  BookmarkCheck,
  Check,
  Eye,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useToastStore } from "@/components/ui/Toast";
import type { Article, Summary, ArticleIntelligence, ArticleWithIntelligence, TopicCategory, StoryType } from "@/types";
import { topicLabels, getRelativeTime } from "@/lib/mock-data";
import { QuickReactions } from "@/components/intelligence/QuickReactions";
import { GoDeeper } from "@/components/intelligence/GoDeeper";
import { RemindMeButton } from "@/components/intelligence/RemindMeButton";
import { SignalBadges } from "@/components/intelligence/SignalBadge";

interface HeroStoryCardProps {
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

export function HeroStoryCard({
  article,
  onSave,
  onOpenReader,
  onRequestSummary,
  onExpand,
}: HeroStoryCardProps) {
  const [isSaved, setIsSaved] = useState(article.isSaved);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [saveAnimating, setSaveAnimating] = useState(false);
  const [showCheckOverlay, setShowCheckOverlay] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

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
    const willSave = !isSaved;
    setIsSaved(willSave);
    setSaveAnimating(true);
    setTimeout(() => setSaveAnimating(false), 200);

    if (willSave) {
      setShowCheckOverlay(true);
      setTimeout(() => setShowCheckOverlay(false), 500);
      addToast("Saved to library", "success");
    } else {
      addToast("Removed from library", "info");
    }

    onSave?.(article.id);
  };

  const [imgError, setImgError] = useState(false);

  const intelligence = article.intelligence;
  const storyType = intelligence?.storyType;
  const significance = intelligence?.significanceScore || 5;
  const topicStyle = getTopicStyle(article.topic);
  const showImage = article.imageUrl && !imgError;

  return (
    <div
      className="group relative overflow-hidden cursor-pointer transition-all duration-200"
      onClick={() => onOpenReader?.(article)}
      data-feed-index={0}
    >
      {/* Image background if available */}
      {showImage && (
        <div className="relative h-48 w-full overflow-hidden bg-bg-secondary">
          <img
            src={article.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      {/* Significance bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl z-10"
        style={{
          backgroundColor: getSignificanceColor(significance),
        }}
      />

      {/* Content */}
      <div className={`px-5 pb-4 pl-7 ${article.imageUrl ? "pt-3" : "pt-5"}`}>
        {/* Badges */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-accent-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-inverse">
            Top Story
          </span>
          {article.sourceTier === 1 && (
            <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">
              Primary Source
            </span>
          )}
          {article.documentType && (
            <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
              {article.documentType}
            </span>
          )}
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={topicStyle}
          >
            {topicLabels[article.topic]}
          </span>
          {storyType && (
            <span className="pill-outlined">
              {STORY_TYPE_STYLES[storyType].label}
            </span>
          )}
          {article.watchlistMatches.length > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-accent-warning/15 px-2 py-0.5 text-xs font-medium text-accent-warning">
              <Eye size={10} />
              Watchlist
            </span>
          )}
          <SignalBadges signals={article.signals} max={2} />
          {significance >= 7 && (
            <span
              className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{
                backgroundColor: getSignificanceColor(significance) + "18",
                color: getSignificanceColor(significance),
              }}
            >
              {significance}/10
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="mb-2 text-xl font-bold leading-tight text-text-primary group-hover:text-accent-primary transition-colors">
          {article.title}
        </h3>

        {/* Source / meta */}
        <div className="mb-3 flex items-center gap-2 text-xs text-text-tertiary">
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

        {/* AI Summary */}
        {isLoadingSummary && (
          <div className="flex items-center gap-3 py-3 text-text-tertiary">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Generating AI summary...</span>
          </div>
        )}

        {!isLoadingSummary && article.summary?.theNews && (
          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm leading-relaxed text-text-secondary">
              {article.summary.theNews}
            </p>

            {article.summary.whyItMatters && (
              <div className="border-l-2 border-border-primary pl-3">
                <h4 className="mb-1 flex items-center gap-2 text-xs font-semibold text-text-primary">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-warning" />
                  Why It Matters
                </h4>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {article.summary.whyItMatters}
                </p>
              </div>
            )}

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

            {/* Quick Reactions + Remind Me — visible on hover */}
            <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <QuickReactions articleId={article.id} />
              <RemindMeButton articleId={article.id} />
            </div>

            {/* Go Deeper / Explain This — visible on hover */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <GoDeeper
                articleId={article.id}
                articleTitle={article.title}
                articleContent={article.content}
              />
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="mt-3 flex items-center justify-between border-t border-border-secondary pt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenReader?.(article);
            }}
            className="text-xs font-medium text-accent-primary hover:text-accent-primary-hover transition-colors"
          >
            Read Full Article &rarr;
          </button>
          <button
            onClick={handleSave}
            className="relative rounded-md p-1.5 text-text-tertiary hover:text-accent-primary transition-colors"
            aria-label={isSaved ? "Unsave" : "Save"}
          >
            <span className={saveAnimating ? "save-button-pop" : ""}>
              {isSaved ? (
                <BookmarkCheck size={18} className="text-accent-primary" />
              ) : (
                <Bookmark size={18} />
              )}
            </span>
            {showCheckOverlay && (
              <span className="save-check-overlay absolute inset-0 flex items-center justify-center">
                <Check size={14} className="text-accent-success" />
              </span>
            )}
          </button>
        </div>
      </div>
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
