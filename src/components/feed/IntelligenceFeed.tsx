"use client";

import { useMemo, useState } from "react";
import {
  RefreshCw,
  ArrowUp,
  Loader2,
  CheckCheck,
  Bookmark,
} from "lucide-react";
import type {
  Article,
  Summary,
  ArticleIntelligence,
  ArticleWithIntelligence,
  TopicCategory,
} from "@/types";
import { topicLabels, topicDotColors } from "@/lib/mock-data";

function getRelativeTimeShort(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatArticleTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / 3600000;

  if (diffHours < 24) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).toUpperCase();
  }
  if (diffHours < 48) return "YESTERDAY";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
}

function getCurationReason(
  article: Article & { summary?: Summary; intelligence?: ArticleIntelligence }
): string | null {
  if (article.watchlistMatches && article.watchlistMatches.length > 0) {
    return `Matches '${article.watchlistMatches[0]}' interest`;
  }
  const intel = (article as ArticleWithIntelligence).intelligence;
  if (intel) {
    if (intel.significanceScore >= 8) return "High importance";
    if (intel.storyType === "breaking") return "Breaking story";
  }
  return null;
}

interface IntelligenceFeedProps {
  articles: (Article & {
    summary?: Summary;
    intelligence?: ArticleIntelligence;
  })[];
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
  onMarkAllRead?: (articleIds: string[]) => void;
}

const ITEMS_PER_PAGE = 20;

export function IntelligenceFeed({
  articles,
  onSave,
  onOpenReader,
  newCount = 0,
  onShowNew,
  lastUpdated,
  onForceRefresh,
  isRefreshing,
  onMarkAllRead,
}: IntelligenceFeedProps) {
  const [activeTab, setActiveTab] = useState<"all" | TopicCategory>("all");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Sort all articles by publishedAt descending
  const sortedArticles = useMemo(
    () =>
      [...articles].sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      ),
    [articles]
  );

  // Hero story: highest significance or first article
  const heroArticle = useMemo(() => {
    if (sortedArticles.length === 0) return null;
    // Pick article with highest significance score
    let best = sortedArticles[0];
    let bestScore = 0;
    for (const a of sortedArticles) {
      const score =
        (a as ArticleWithIntelligence).intelligence?.significanceScore ?? 0;
      if (score > bestScore) {
        bestScore = score;
        best = a;
      }
    }
    return best;
  }, [sortedArticles]);

  // Feed articles (all except hero), filtered by topic tab
  const feedArticles = useMemo(() => {
    const withoutHero = heroArticle
      ? sortedArticles.filter((a) => a.id !== heroArticle.id)
      : sortedArticles;
    if (activeTab === "all") return withoutHero;
    return withoutHero.filter((a) => a.topic === activeTab);
  }, [sortedArticles, heroArticle, activeTab]);

  const visibleFeedArticles = feedArticles.slice(0, visibleCount);
  const hasMore = visibleCount < feedArticles.length;

  // Get unique topics for tab bar
  const availableTopics = useMemo(() => {
    const topics = new Set<TopicCategory>();
    for (const a of articles) topics.add(a.topic);
    return Array.from(topics);
  }, [articles]);

  // Hero personalization topics
  const heroTopics = useMemo(() => {
    if (!heroArticle) return [];
    const matches = heroArticle.watchlistMatches ?? [];
    if (matches.length >= 2) return matches.slice(0, 2);
    const label = topicLabels[heroArticle.topic];
    if (matches.length === 1) return [matches[0], label];
    return [label];
  }, [heroArticle]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-0">
      {/* "New stories" pill */}
      {newCount > 0 && onShowNew && (
        <button
          onClick={() => {
            onShowNew();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="sticky top-2 z-30 mx-auto mb-6 flex items-center gap-2 rounded-full bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse shadow-lg hover:bg-accent-primary-hover transition-all hover:scale-105"
        >
          <ArrowUp size={14} />
          {newCount} new {newCount === 1 ? "story" : "stories"}
        </button>
      )}

      {/* Header */}
      <div className="flex items-end justify-between pb-8">
        <div>
          <p className="mb-1 text-sm font-medium text-text-tertiary">{today}</p>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">
            Your Briefing
          </h2>
          {lastUpdated && (
            <p className="mt-1 text-xs text-text-tertiary">
              Updated {getRelativeTimeShort(lastUpdated)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onMarkAllRead && (
            <button
              onClick={() => {
                onMarkAllRead(articles.map((a) => a.id));
              }}
              className="flex items-center gap-1.5 rounded-xl border border-border-primary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover"
              title="Mark all as read"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
          {onForceRefresh && (
            <button
              onClick={onForceRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-xl border border-border-primary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover disabled:opacity-50"
              title="Refresh articles"
            >
              {isRefreshing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          )}
        </div>
      </div>

      {/* ═══ HERO STORY ═══ */}
      {heroArticle && (
        <section className="pb-8">
          <div
            className="flex flex-col md:flex-row gap-6 md:gap-8 cursor-pointer group"
            onClick={() => onOpenReader(heroArticle)}
          >
            {/* Mobile: image on top */}
            {heroArticle.imageUrl && (
              <div className="md:hidden w-full">
                <img
                  src={heroArticle.imageUrl}
                  alt=""
                  className="w-full h-56 object-cover"
                />
              </div>
            )}
            {/* Text side ~55% */}
            <div className="flex-1 md:w-[55%] flex flex-col justify-center">
              <p className="mb-3 flex items-center gap-2 text-xs tracking-widest uppercase text-text-secondary">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: "var(--accent-primary)" }}
                />
                Top Story For You
              </p>
              <h1 className="font-serif font-black text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-text-primary mb-4 group-hover:opacity-80 transition-opacity">
                {heroArticle.title}
              </h1>
              {heroArticle.summary?.brief && (
                <p className="font-sans text-lg text-text-secondary mb-4 line-clamp-3">
                  {heroArticle.summary.brief}
                </p>
              )}
              {heroTopics.length > 0 && (
                <p className="text-sm text-text-secondary mb-4">
                  Based on your interest in{" "}
                  {heroTopics.map((t, i) => (
                    <span key={t}>
                      {i > 0 && " and "}
                      <span className="font-semibold">{t}</span>
                    </span>
                  ))}
                </p>
              )}
              <div className="flex items-center gap-3">
                <span className="bg-text-primary text-text-inverse uppercase text-xs font-medium px-3 py-1 tracking-wide">
                  {topicLabels[heroArticle.topic]}
                </span>
                <span className="border border-text-primary uppercase text-xs font-medium px-3 py-1 tracking-wide text-text-primary">
                  {heroArticle.readingTimeMinutes} MIN READ
                </span>
              </div>
            </div>
            {/* Image side ~45% — desktop only */}
            {heroArticle.imageUrl && (
              <div className="hidden md:block md:w-[45%]">
                <img
                  src={heroArticle.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
          <hr className="mt-8 border-border-primary" />
        </section>
      )}

      {/* ═══ TOPIC FILTER TABS ═══ */}
      <section className="pb-2">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => {
              setActiveTab("all");
              setVisibleCount(ITEMS_PER_PAGE);
            }}
            className={`pb-3 text-sm font-sans whitespace-nowrap transition-colors ${
              activeTab === "all"
                ? "text-text-primary font-semibold underline underline-offset-8 decoration-2"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            All
          </button>
          {availableTopics.map((topic) => (
            <button
              key={topic}
              onClick={() => {
                setActiveTab(topic);
                setVisibleCount(ITEMS_PER_PAGE);
              }}
              className={`pb-3 text-sm font-sans whitespace-nowrap transition-colors ${
                activeTab === topic
                  ? "text-text-primary font-semibold underline underline-offset-8 decoration-2"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {topicLabels[topic]}
            </button>
          ))}
        </div>
        <hr className="border-border-primary" />
      </section>

      {/* ═══ FEED LIST ═══ */}
      <section>
        {visibleFeedArticles.map((article) => {
          const curation = getCurationReason(article);
          return (
            <div key={article.id}>
              <div
                className="flex items-start gap-4 py-6 md:py-8 cursor-pointer group"
                onClick={() => onOpenReader(article)}
              >
                {/* Left side */}
                <div className="flex-1 min-w-0">
                  {/* Line 1: dot + topic + timestamp */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: topicDotColors[article.topic],
                      }}
                    />
                    <span className="text-xs tracking-widest font-semibold uppercase text-text-secondary">
                      {topicLabels[article.topic]}
                    </span>
                    <span className="text-xs text-text-tertiary">·</span>
                    <span className="text-xs text-text-secondary">
                      {formatArticleTime(article.publishedAt)}
                    </span>
                  </div>
                  {/* Line 2: headline */}
                  <h3
                    className={`font-serif font-bold text-xl md:text-2xl text-text-primary mb-1.5 group-hover:opacity-80 transition-opacity ${
                      article.isRead ? "opacity-60" : ""
                    }`}
                  >
                    {article.title}
                  </h3>
                  {/* Line 3: summary */}
                  {(article.summary?.brief || article.content) && (
                    <p className="font-sans text-base text-text-secondary line-clamp-2 mb-2">
                      {article.summary?.brief ||
                        article.content?.slice(0, 200)}
                    </p>
                  )}
                  {/* Line 4: source + curation reason */}
                  <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                    <span>{article.source}</span>
                    {curation && (
                      <>
                        <span>•</span>
                        <span className="italic">{curation}</span>
                      </>
                    )}
                  </div>
                </div>
                {/* Right side: save icon */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSave(article.id);
                  }}
                  className="flex-shrink-0 mt-2 p-1.5 text-text-secondary hover:text-text-primary transition-colors"
                  title={article.isSaved ? "Unsave" : "Save"}
                >
                  <Bookmark
                    size={18}
                    className={article.isSaved ? "fill-current" : ""}
                  />
                </button>
              </div>
              <hr className="border-border-primary" />
            </div>
          );
        })}

        {/* Load more */}
        {hasMore && (
          <div className="py-8 text-center">
            <button
              onClick={() => setVisibleCount((c) => c + ITEMS_PER_PAGE)}
              className="text-sm text-text-secondary underline hover:text-text-primary transition-colors"
            >
              Load more stories
            </button>
          </div>
        )}
      </section>

      {/* Empty state */}
      {articles.length === 0 && (
        <div className="rounded-2xl border border-border-secondary bg-bg-card p-16 text-center">
          <h3 className="text-xl font-bold text-text-primary mb-2">
            Setting up your feed
          </h3>
          <p className="text-sm text-text-tertiary mb-6 max-w-sm mx-auto">
            {isRefreshing
              ? "Fetching articles from your sources..."
              : "Your feed will populate automatically. You can also refresh manually."}
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent-primary px-5 py-2.5 text-sm font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors"
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
