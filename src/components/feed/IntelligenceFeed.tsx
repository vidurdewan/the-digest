"use client";

import { useMemo, useState } from "react";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ArrowUp,
  Loader2,
} from "lucide-react";
import type { Article, Summary, ArticleIntelligence, ArticleWithIntelligence } from "@/types";
import { topicLabels } from "@/lib/mock-data";
import { selectDiverseTopStories, groupByTopic } from "@/lib/feed-layout";
import { TodaysBrief } from "./TodaysBrief";
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
    <div className="space-y-10">
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
          <h2 className="text-3xl font-bold text-text-primary tracking-tight">
            Your Briefing
          </h2>
          {lastUpdated && (
            <p className="mt-1 text-xs text-text-tertiary">
              Updated {getRelativeTimeShort(lastUpdated)}
            </p>
          )}
        </div>
        {onForceRefresh && (
          <button
            onClick={onForceRefresh}
            disabled={isRefreshing}
            className="rounded-lg p-2 text-text-tertiary hover:text-text-secondary hover:bg-bg-secondary transition-colors disabled:opacity-50"
            title="Refresh"
          >
            {isRefreshing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
          </button>
        )}
      </div>

      {/* Reading Progress — very subtle */}
      <ReadingProgress totalItems={priorityItems} readItems={readPriorityItems} />

      {/* ═══ TODAY'S BRIEF ═══ */}
      <TodaysBrief />

      {/* ═══ TOP STORIES — 5 equal horizontal scroll cards ═══ */}
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

          {/* Horizontal scroll — equal cards */}
          <div className="relative">
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
              {topStories.map((article) => (
                <TopStoryCard
                  key={article.id}
                  article={article as ArticleWithIntelligence}
                  onSave={onSave}
                  onOpenReader={onOpenReader}
                  onRequestSummary={onRequestSummary}
                  onExpand={onExpand}
                />
              ))}
            </div>
            {/* Fade gradient on right edge */}
            {topStories.length > 3 && (
              <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-16 bg-gradient-to-l from-bg-primary to-transparent" />
            )}
          </div>

          {/* Surprise Me */}
          <SurpriseMe
            articles={everythingElse as ArticleWithIntelligence[]}
            onSave={onSave}
            onOpenReader={onOpenReader}
            onRequestSummary={onRequestSummary}
            onExpand={onExpand}
          />
        </section>
      )}

      {/* ═══ TOPIC SWIMLANES ═══ */}
      {topicGroups.length > 0 && (
        <section>
          <div className="mb-6 flex items-center gap-3">
            <h3 className="text-lg font-bold text-text-primary">
              By Topic
            </h3>
          </div>

          <div className="space-y-8">
            {topicGroups.map(({ topic, articles: topicArticles }) => {
              const displayArticles = topicArticles.slice(0, SWIMLANE_MAX_PER_TOPIC);
              if (displayArticles.length === 0) return null;

              return (
                <div key={topic}>
                  {/* Swimlane header — clean */}
                  <div className="mb-3 flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-text-primary">
                      {topicLabels[topic]}
                    </h4>
                    <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
                      {displayArticles.length}
                    </span>
                  </div>

                  {/* Horizontal scrollable row */}
                  <div className="relative">
                    <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
                      {displayArticles.map((article) => (
                        <SwimlaneCard
                          key={article.id}
                          article={article as ArticleWithIntelligence}
                          onSave={onSave}
                          onOpenReader={onOpenReader}
                        />
                      ))}
                    </div>
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

      {/* ═══ EVERYTHING ELSE ═══ */}
      {everythingElse.length > 0 && (
        <section>
          <button
            onClick={() => setEverythingElseOpen(!everythingElseOpen)}
            className="mb-3 flex w-full items-center justify-between rounded-lg px-1 py-2 text-sm font-semibold text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <span className="flex items-center gap-2">
              More Stories
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
