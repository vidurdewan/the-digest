"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowUp,
  Loader2,
  MoreHorizontal,
  CheckCheck,
} from "lucide-react";
import type { Article, Summary, ArticleIntelligence, ArticleWithIntelligence } from "@/types";
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

function ScrollableRow({ children, gap = "gap-4" }: { children: React.ReactNode; gap?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [childCount, setChildCount] = useState(0);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.6;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  const updateScrollPosition = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const count = el.children.length;
    setChildCount(count);
    if (count === 0) return;
    const firstChild = el.children[0] as HTMLElement;
    const cardWidth = firstChild.offsetWidth;
    const gapSize = parseInt(gap.replace("gap-", "")) * 4; // Tailwind gap units
    const idx = Math.round(el.scrollLeft / (cardWidth + gapSize));
    setActiveIndex(Math.min(idx, count - 1));
  }, [gap]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollPosition();
    el.addEventListener("scroll", updateScrollPosition, { passive: true });
    return () => el.removeEventListener("scroll", updateScrollPosition);
  }, [updateScrollPosition, children]);

  const maxDots = 8;
  const showDots = childCount > 1;

  return (
    <div className="carousel-container">
      <button
        onClick={() => scroll("left")}
        className="carousel-arrow carousel-arrow-left"
        aria-label="Scroll left"
      >
        <ChevronLeft size={16} />
      </button>
      <div
        ref={scrollRef}
        className={`flex ${gap} overflow-x-auto pb-2 pr-8 snap-x snap-mandatory scrollbar-hide`}
      >
        {children}
      </div>
      <button
        onClick={() => scroll("right")}
        className="carousel-arrow carousel-arrow-right"
        aria-label="Scroll right"
      >
        <ChevronRight size={16} />
      </button>
      {/* Right-edge fade */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-[var(--bg-primary)] to-transparent" />
      {/* Scroll indicators */}
      {showDots && (
        <div className="mt-2 flex items-center justify-center gap-1">
          {Array.from({ length: Math.min(childCount, maxDots) }).map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-200 ${
                i === activeIndex
                  ? "w-4 bg-accent-primary"
                  : "w-1 bg-border-primary"
              }`}
            />
          ))}
          {childCount > maxDots && (
            <span className="text-[10px] text-text-tertiary ml-1">
              +{childCount - maxDots}
            </span>
          )}
        </div>
      )}
    </div>
  );
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
  onMarkAllRead?: (articleIds: string[]) => void;
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
  onMarkAllRead,
}: IntelligenceFeedProps) {
  const [everythingElseOpen, setEverythingElseOpen] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [hiddenTopics, setHiddenTopics] = useState<Set<string>>(new Set());
  const [openMenuTopic, setOpenMenuTopic] = useState<string | null>(null);

  const toggleTopicExpanded = (topic: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  };

  const hideTopic = (topic: string) => {
    setHiddenTopics((prev) => new Set(prev).add(topic));
    setOpenMenuTopic(null);
  };

  // Split articles into top stories (diverse) and remaining
  const { topStories, remaining } = useMemo(
    () => selectDiverseTopStories(articles as ArticleWithIntelligence[], 5),
    [articles]
  );

  // Group remaining articles by topic for swimlanes
  const topicGroups = useMemo(() => groupByTopic(remaining), [remaining]);

  // Split remaining into swimlane articles and everything else
  const swimlaneArticleIds = new Set<string>();
  const SWIMLANE_MAX_PER_TOPIC = 12;
  for (const group of topicGroups) {
    for (const a of group.articles.slice(0, SWIMLANE_MAX_PER_TOPIC)) {
      swimlaneArticleIds.add(a.id);
    }
  }
  const everythingElse = remaining.filter((a) => !swimlaneArticleIds.has(a.id));

  // Reading progress
  const priorityItems = topStories.length + swimlaneArticleIds.size;
  const readPriorityItems = [...topStories, ...remaining.filter((a) => swimlaneArticleIds.has(a.id))].filter(
    (a) => a.isRead || (a as ArticleWithIntelligence).summary?.theNews
  ).length;

  useReadingProgress({ totalPriorityItems: priorityItems, itemsRead: readPriorityItems });

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* "New stories" pill */}
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

      {/* Header — clean, spacious */}
      <div className="flex items-end justify-between">
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
                const allVisibleIds = [
                  ...topStories.map((a) => a.id),
                  ...topicGroups.flatMap(({ articles: ta }) =>
                    ta.slice(0, SWIMLANE_MAX_PER_TOPIC).map((a) => a.id)
                  ),
                ];
                onMarkAllRead(allVisibleIds);
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

      {/* Reading Progress */}
      <ReadingProgress totalItems={priorityItems} readItems={readPriorityItems} />

      {/* ═══ TODAY'S BRIEF ═══ */}
      <TodaysBrief />

      {/* ═══ TOP STORIES — Hero #1 + horizontal scroll ═══ */}
      {topStories.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary">
              Top Stories
            </h3>
            <span className="text-xs font-medium text-text-tertiary">
              {topStories.length} stories
            </span>
          </div>

          {/* Hero card for #1 story — full width with image */}
          <div className="mb-4">
            <HeroStoryCard
              article={topStories[0] as ArticleWithIntelligence}
              onSave={onSave}
              onOpenReader={onOpenReader}
              onRequestSummary={onRequestSummary}
              onExpand={onExpand}
            />
          </div>

          {/* Remaining top stories — horizontal scroll */}
          {topStories.length > 1 && (
            <ScrollableRow>
              {topStories.slice(1).map((article) => (
                <TopStoryCard
                  key={article.id}
                  article={article as ArticleWithIntelligence}
                  onSave={onSave}
                  onOpenReader={onOpenReader}
                  onRequestSummary={onRequestSummary}
                  onExpand={onExpand}
                />
              ))}
            </ScrollableRow>
          )}
        </section>
      )}

      {/* ═══ TOPIC GRIDS ═══ */}
      {topicGroups.length > 0 && (() => {
        const visibleGroups = topicGroups.filter(
          ({ topic, articles: ta }) =>
            !hiddenTopics.has(topic) && ta.slice(0, SWIMLANE_MAX_PER_TOPIC).length > 0
        );

        return (
          <section>
            <div className="mb-6 flex items-center gap-3">
              <h3 className="text-lg font-bold text-text-primary">
                By Topic
              </h3>
            </div>

            <div className="space-y-6">
              {visibleGroups.map(({ topic, articles: topicArticles }, visibleIndex) => {
                const displayArticles = topicArticles.slice(0, SWIMLANE_MAX_PER_TOPIC);
                const isExpanded = expandedTopics.has(topic);
                const visibleArticles = isExpanded ? displayArticles : displayArticles.slice(0, 3);
                const hasMore = displayArticles.length > 3;

                return (
                  <div key={topic}>
                    {/* Insert "Something Different" between 2nd and 3rd topic rows */}
                    {visibleIndex === 2 && (
                      <div className="mb-6">
                        <SurpriseMe
                          articles={everythingElse as ArticleWithIntelligence[]}
                          onSave={onSave}
                          onOpenReader={onOpenReader}
                          onRequestSummary={onRequestSummary}
                          onExpand={onExpand}
                          subtitle="Outside your usual reading"
                        />
                      </div>
                    )}

                    {/* Topic header — grid toggle + menu */}
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-text-primary">
                          {topicLabels[topic]}
                        </h4>
                        <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
                          {displayArticles.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasMore && (
                          <button
                            onClick={() => toggleTopicExpanded(topic)}
                            className="text-xs font-medium text-accent-primary hover:text-accent-primary-hover transition-colors"
                          >
                            {isExpanded ? "Show less" : `Show all ${displayArticles.length}`}
                          </button>
                        )}
                        {/* ⋯ menu */}
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuTopic(openMenuTopic === topic ? null : topic)}
                            className="rounded-md p-1 text-text-tertiary hover:text-text-secondary hover:bg-bg-secondary transition-colors"
                            aria-label="Topic options"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                          {openMenuTopic === topic && (
                            <>
                              <div
                                className="fixed inset-0 z-20"
                                onClick={() => setOpenMenuTopic(null)}
                              />
                              <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-xl border border-border-secondary bg-bg-card py-1 shadow-lg">
                                <button
                                  onClick={() => {
                                    const ids = topicArticles.slice(0, SWIMLANE_MAX_PER_TOPIC).map((a) => a.id);
                                    onMarkAllRead?.(ids);
                                    setOpenMenuTopic(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-text-secondary hover:bg-bg-hover transition-colors"
                                >
                                  <CheckCheck size={12} />
                                  Mark all as read
                                </button>
                                <button
                                  onClick={() => hideTopic(topic)}
                                  className="flex w-full items-center px-3 py-2 text-left text-xs text-text-secondary hover:bg-bg-hover transition-colors"
                                >
                                  Hide topic
                                </button>
                                <button
                                  onClick={() => setOpenMenuTopic(null)}
                                  className="flex w-full items-center px-3 py-2 text-left text-xs text-text-secondary hover:bg-bg-hover transition-colors"
                                >
                                  Set priority
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Grid layout — replaces horizontal carousel */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {visibleArticles.map((article, i) => (
                        <div
                          key={article.id}
                          className={isExpanded && i >= 3 ? "section-enter" : ""}
                        >
                          <SwimlaneCard
                            article={article as ArticleWithIntelligence}
                            onSave={onSave}
                            onOpenReader={onOpenReader}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Fallback: if fewer than 3 visible groups, show SurpriseMe at the end */}
              {visibleGroups.length < 3 && (
                <SurpriseMe
                  articles={everythingElse as ArticleWithIntelligence[]}
                  onSave={onSave}
                  onOpenReader={onOpenReader}
                  onRequestSummary={onRequestSummary}
                  onExpand={onExpand}
                  subtitle="Outside your usual reading"
                />
              )}
            </div>
          </section>
        );
      })()}

      {/* ═══ EVERYTHING ELSE ═══ */}
      {everythingElse.length > 0 && (
        <section>
          <button
            onClick={() => setEverythingElseOpen(!everythingElseOpen)}
            className="mb-3 flex w-full items-center justify-between rounded-lg px-1 py-2 text-sm font-semibold text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <span className="flex items-center gap-2">
              {everythingElseOpen ? "Hide" : "Show"} Remaining Stories
              <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[11px] font-medium">
                {everythingElse.length}
              </span>
            </span>
            {everythingElseOpen ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>
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
