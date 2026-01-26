"use client";

import { useMemo, useState } from "react";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import {
  Zap,
  Mail,
  TrendingUp,
  Eye,
  Bookmark,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ArrowUp,
  Loader2,
} from "lucide-react";
import type { Article, Summary, ArticleIntelligence, ArticleWithIntelligence } from "@/types";
import { assignFeedTiers } from "@/lib/ranking";
import { StartHereCard } from "./StartHereCard";
import { AlsoNotableCard } from "./AlsoNotableCard";
import { CompactListItem } from "./CompactListItem";
import { ReadingProgress } from "./ReadingProgress";
import { SurpriseMe } from "./SurpriseMe";

function getRelativeTimeShort(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface IntelligenceFeedProps {
  articles: (Article & { summary?: Summary; intelligence?: ArticleIntelligence })[];
  onSave: (id: string) => void;
  onOpenReader: (article: Article & { summary?: Summary }) => void;
  onRequestSummary?: (
    article: Article & { summary?: Summary }
  ) => Promise<Summary | null>;
  onExpand?: (articleId: string) => void;
  /** Number of new articles available (from polling) */
  newCount?: number;
  /** Callback to show new articles and refresh feed */
  onShowNew?: () => void;
  /** When the feed was last refreshed */
  lastUpdated?: Date | null;
  /** Manual force-refresh (triggers full ingest) */
  onForceRefresh?: () => void;
  /** Whether a force refresh is in progress */
  isRefreshing?: boolean;
}

export function IntelligenceFeed({
  articles,
  onSave,
  onOpenReader,
  onRequestSummary,
  onExpand,
  newCount = 0,
  onShowNew,
  lastUpdated,
  onForceRefresh,
  isRefreshing,
}: IntelligenceFeedProps) {
  const [everythingElseOpen, setEverythingElseOpen] = useState(false);

  // Assign tiers to ranked articles
  const tieredArticles = useMemo(
    () => assignFeedTiers(articles),
    [articles]
  );

  const startHere = tieredArticles.filter((a) => a.feedTier === "start-here");
  const alsoNotable = tieredArticles.filter((a) => a.feedTier === "also-notable");
  const everythingElse = tieredArticles.filter((a) => a.feedTier === "everything-else");

  // Reading progress: count articles in Start Here + Also Notable that have been "read" (expanded)
  const priorityItems = startHere.length + alsoNotable.length;
  const readPriorityItems = [...startHere, ...alsoNotable].filter(
    (a) => a.isRead || a.summary?.theNews
  ).length;

  // Persist reading progress
  useReadingProgress({ totalPriorityItems: priorityItems, itemsRead: readPriorityItems });

  // Stats
  const unread = articles.filter((a) => !a.isRead).length;
  const watchlistCount = articles.filter(
    (a) => a.watchlistMatches.length > 0
  ).length;
  const savedCount = articles.filter((a) => a.isSaved).length;

  return (
    <div className="space-y-6">
      {/* "New stories" pill — Twitter-style */}
      {newCount > 0 && onShowNew && (
        <button
          onClick={() => {
            onShowNew();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="sticky top-2 z-30 mx-auto flex items-center gap-2 rounded-full bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse shadow-lg hover:bg-accent-primary-hover transition-all hover:scale-105"
        >
          <ArrowUp size={14} />
          {newCount} new {newCount === 1 ? "story" : "stories"}
        </button>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap size={24} className="text-accent-primary" />
          <div>
            <h2 className="text-2xl font-bold text-text-primary">
              Priority Feed
            </h2>
            <p className="text-sm text-text-tertiary">
              {lastUpdated
                ? `Updated ${getRelativeTimeShort(lastUpdated)}`
                : "Your AI intelligence briefing"}
            </p>
          </div>
        </div>
        {/* Subtle refresh icon — tucked away */}
        {onForceRefresh && (
          <button
            onClick={onForceRefresh}
            disabled={isRefreshing}
            className="rounded-lg p-2 text-text-tertiary hover:text-text-secondary hover:bg-bg-secondary transition-colors disabled:opacity-50"
            title="Force refresh"
          >
            {isRefreshing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
          </button>
        )}
      </div>

      {/* Reading Progress */}
      <ReadingProgress totalItems={priorityItems} readItems={readPriorityItems} />

      {/* Stats bar */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {[
          { label: "Unread", value: unread.toString(), icon: Mail },
          {
            label: "Total",
            value: articles.length.toString(),
            icon: TrendingUp,
          },
          { label: "Watchlist", value: watchlistCount.toString(), icon: Eye },
          { label: "Saved", value: savedCount.toString(), icon: Bookmark },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex min-w-[120px] items-center gap-3 rounded-lg border border-border-primary bg-bg-card p-2.5 transition-theme"
          >
            <stat.icon size={16} className="shrink-0 text-accent-primary" />
            <div>
              <p className="text-base font-bold text-text-primary">
                {stat.value}
              </p>
              <p className="text-[11px] text-text-tertiary">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Section 1: Start Here (Top 5) */}
      {startHere.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-border-primary" />
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-accent-primary">
              <Zap size={14} />
              Start Here
            </h3>
            <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-xs font-medium text-accent-primary">
              Top {startHere.length}
            </span>
            <div className="h-px flex-1 bg-border-primary" />
          </div>
          <div className="space-y-4">
            {startHere.map((article, index) => (
              <StartHereCard
                key={article.id}
                article={article}
                rank={index + 1}
                onSave={onSave}
                onOpenReader={onOpenReader}
                onRequestSummary={onRequestSummary}
                onExpand={onExpand}
              />
            ))}
          </div>

          {/* Surprise Me — one story from outside usual topics */}
          <SurpriseMe
            articles={everythingElse}
            onSave={onSave}
            onOpenReader={onOpenReader}
            onRequestSummary={onRequestSummary}
            onExpand={onExpand}
          />
        </section>
      )}

      {/* Section 2: Also Notable (Next 15) */}
      {alsoNotable.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-border-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
              Also Notable
            </h3>
            <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-xs font-medium text-text-tertiary">
              {alsoNotable.length}
            </span>
            <div className="h-px flex-1 bg-border-primary" />
          </div>
          <div className="space-y-3">
            {alsoNotable.map((article) => (
              <AlsoNotableCard
                key={article.id}
                article={article}
                onSave={onSave}
                onOpenReader={onOpenReader}
                onRequestSummary={onRequestSummary}
                onExpand={onExpand}
              />
            ))}
          </div>
        </section>
      )}

      {/* Section 3: Everything Else */}
      {everythingElse.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-border-primary" />
            <button
              onClick={() => setEverythingElseOpen(!everythingElseOpen)}
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-tertiary hover:text-text-secondary transition-colors"
            >
              Everything Else
              <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-xs font-medium">
                {everythingElse.length}
              </span>
              {everythingElseOpen ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>
            <div className="h-px flex-1 bg-border-primary" />
          </div>
          {everythingElseOpen && (
            <div className="space-y-1.5">
              {everythingElse.map((article) => (
                <CompactListItem
                  key={article.id}
                  article={article}
                  onSave={onSave}
                  onOpenReader={onOpenReader}
                  onRequestSummary={onRequestSummary}
                  onExpand={onExpand}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Empty state — only shown on first-time setup */}
      {articles.length === 0 && (
        <div className="rounded-xl border border-border-primary bg-bg-card p-12 text-center">
          <Zap size={48} className="mx-auto mb-4 text-text-tertiary opacity-30" />
          <h3 className="text-lg font-semibold text-text-primary mb-1">
            Setting up your feed
          </h3>
          <p className="text-sm text-text-tertiary mb-4">
            {isRefreshing
              ? "Fetching articles from your sources..."
              : "Your feed will populate automatically. You can also force a refresh."}
          </p>
          {isRefreshing ? (
            <div className="flex items-center justify-center gap-2 text-accent-primary">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm font-medium">Loading articles...</span>
            </div>
          ) : (
            onForceRefresh && (
              <button
                onClick={onForceRefresh}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors"
              >
                <RefreshCw size={14} />
                Refresh Now
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
