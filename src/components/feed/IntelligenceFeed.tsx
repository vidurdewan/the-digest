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
import type { Article, Summary, ArticleIntelligence, ArticleWithIntelligence, TopicCategory } from "@/types";
import { topicLabels } from "@/lib/mock-data";
import { selectDiverseTopStories, groupByTopic } from "@/lib/feed-layout";
import { TodaysBrief } from "./TodaysBrief";
import { HeroStoryCard } from "./HeroStoryCard";
import { TopStoryCard } from "./TopStoryCard";
import { SwimlaneCard } from "./SwimlaneCard";
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
  newCount?: number;
  onShowNew?: () => void;
  lastUpdated?: Date | null;
  onForceRefresh?: () => void;
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

  // Split articles into hero/top stories (diverse) and remaining
  const { topStories, remaining } = useMemo(
    () => selectDiverseTopStories(articles as ArticleWithIntelligence[], 5),
    [articles]
  );

  const heroStory = topStories[0] as ArticleWithIntelligence | undefined;
  const gridStories = topStories.slice(1) as ArticleWithIntelligence[];

  // Group remaining articles by topic for swimlanes
  const topicGroups = useMemo(() => groupByTopic(remaining), [remaining]);

  // Split remaining into swimlane articles (first 15 per topic) and everything else
  const swimlaneArticleIds = new Set<string>();
  const SWIMLANE_MAX_PER_TOPIC = 15;
  for (const group of topicGroups) {
    for (const a of group.articles.slice(0, SWIMLANE_MAX_PER_TOPIC)) {
      swimlaneArticleIds.add(a.id);
    }
  }
  const everythingElse = remaining.filter((a) => !swimlaneArticleIds.has(a.id));

  // Reading progress: count articles in top stories + swimlanes that have been "read"
  const priorityItems = topStories.length + swimlaneArticleIds.size;
  const readPriorityItems = [...topStories, ...remaining.filter((a) => swimlaneArticleIds.has(a.id))].filter(
    (a) => a.isRead || (a as ArticleWithIntelligence).summary?.theNews
  ).length;

  useReadingProgress({ totalPriorityItems: priorityItems, itemsRead: readPriorityItems });

  // Stats
  const unread = articles.filter((a) => !a.isRead).length;
  const watchlistCount = articles.filter((a) => a.watchlistMatches.length > 0).length;
  const savedCount = articles.filter((a) => a.isSaved).length;

  return (
    <div className="space-y-8">
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

      {/* Stats bar — minimal inline */}
      <div className="flex items-center gap-4 text-xs text-text-tertiary">
        <span className="flex items-center gap-1.5">
          <Mail size={13} className="text-accent-primary" />
          <span className="font-semibold text-text-primary">{unread}</span> unread
        </span>
        <span className="text-border-primary">|</span>
        <span className="flex items-center gap-1.5">
          <TrendingUp size={13} />
          <span className="font-semibold text-text-primary">{articles.length}</span> total
        </span>
        {watchlistCount > 0 && (
          <>
            <span className="text-border-primary">|</span>
            <span className="flex items-center gap-1.5">
              <Eye size={13} className="text-accent-warning" />
              <span className="font-semibold text-text-primary">{watchlistCount}</span> watchlist
            </span>
          </>
        )}
        {savedCount > 0 && (
          <>
            <span className="text-border-primary">|</span>
            <span className="flex items-center gap-1.5">
              <Bookmark size={13} />
              <span className="font-semibold text-text-primary">{savedCount}</span> saved
            </span>
          </>
        )}
      </div>

      {/* ═══ SECTION 1: Today's Brief ═══ */}
      <TodaysBrief />

      {/* ═══ SECTION 2: Hero Story + Top Stories Grid ═══ */}
      {topStories.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-border-primary" />
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-accent-primary">
              <Zap size={14} />
              Top Stories
            </h3>
            <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-xs font-medium text-accent-primary">
              {topStories.length}
            </span>
            <div className="h-px flex-1 bg-border-primary" />
          </div>

          {/* Hero + Grid layout */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Hero — left half on desktop */}
            {heroStory && (
              <div className="lg:row-span-2">
                <HeroStoryCard
                  article={heroStory}
                  onSave={onSave}
                  onOpenReader={onOpenReader}
                  onRequestSummary={onRequestSummary}
                  onExpand={onExpand}
                />
              </div>
            )}

            {/* Grid stories — 2x2 on desktop */}
            {gridStories.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
                {gridStories.map((article) => (
                  <TopStoryCard
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
          </div>

          {/* Surprise Me — one story from outside usual topics */}
          <SurpriseMe
            articles={everythingElse as ArticleWithIntelligence[]}
            onSave={onSave}
            onOpenReader={onOpenReader}
            onRequestSummary={onRequestSummary}
            onExpand={onExpand}
          />
        </section>
      )}

      {/* ═══ SECTION 3: Topic Swimlanes ═══ */}
      {topicGroups.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-border-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
              By Topic
            </h3>
            <div className="h-px flex-1 bg-border-primary" />
          </div>

          <div className="space-y-6">
            {topicGroups.map(({ topic, articles: topicArticles }) => {
              const displayArticles = topicArticles.slice(0, SWIMLANE_MAX_PER_TOPIC);
              if (displayArticles.length === 0) return null;

              return (
                <div key={topic}>
                  {/* Swimlane header */}
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: getTopicColor(topic) }}
                    />
                    <h4 className="text-sm font-semibold text-text-primary">
                      {topicLabels[topic]}
                    </h4>
                    <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-xs font-medium text-text-tertiary">
                      {displayArticles.length}
                    </span>
                  </div>

                  {/* Horizontal scrollable row */}
                  <div className="relative">
                    <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin">
                      {displayArticles.map((article) => (
                        <SwimlaneCard
                          key={article.id}
                          article={article as ArticleWithIntelligence}
                          onSave={onSave}
                          onOpenReader={onOpenReader}
                        />
                      ))}
                    </div>
                    {/* Fade gradient on right edge */}
                    {displayArticles.length > 3 && (
                      <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-bg-primary to-transparent" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══ SECTION 4: Everything Else ═══ */}
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
                  article={article as ArticleWithIntelligence}
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

function getTopicColor(topic: TopicCategory): string {
  const colors: Record<TopicCategory, string> = {
    "vc-startups": "#1e40af",
    "fundraising-acquisitions": "#065f46",
    "executive-movements": "#5b21b6",
    "financial-markets": "#92400e",
    geopolitics: "#991b1b",
    automotive: "#155e75",
    "science-tech": "#3730a3",
    "local-news": "#9a3412",
    politics: "#9d174d",
  };
  return colors[topic] || "#6b7280";
}
