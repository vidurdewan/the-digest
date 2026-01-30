"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowUp,
  Loader2,
  Bookmark,
  X,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import type {
  Article,
  Summary,
  ArticleIntelligence,
  ArticleWithIntelligence,
  TopicCategory,
} from "@/types";
import { topicLabels, topicDotColors } from "@/lib/mock-data";
import { ExpandedArticleView } from "@/components/articles/ExpandedArticleView";
import { useReadStateStore } from "@/lib/store";
import { CheckCircle } from "lucide-react";
import { getSourceType, getSourceTypeConfig, findCoverageDensity } from "@/lib/source-provenance";

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
  onRequestSummary,
  newCount = 0,
  onShowNew,
  lastUpdated,
  onForceRefresh,
  isRefreshing,
  onMarkAllRead,
}: IntelligenceFeedProps) {
  const [activeTab, setActiveTab] = useState<"all" | TopicCategory>("all");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
  const [isLoadingExpanded, setIsLoadingExpanded] = useState(false);
  const expandedRef = useRef<HTMLDivElement>(null);
  const markArticleRead = useReadStateStore((s) => s.markArticleRead);
  const readArticleIds = useReadStateStore((s) => s.readArticleIds);
  const digestReadToday = useReadStateStore((s) => s.digestReadToday);
  const [caughtUpDismissed, setCaughtUpDismissed] = useState(false);

  const handleArticleClick = useCallback(async (article: Article & { summary?: Summary; intelligence?: ArticleIntelligence }) => {
    if (expandedArticleId === article.id) {
      setExpandedArticleId(null);
      return;
    }
    setExpandedArticleId(article.id);
    // Request summary if not available
    if (!article.summary?.theNews && onRequestSummary) {
      setIsLoadingExpanded(true);
      await onRequestSummary(article);
      setIsLoadingExpanded(false);
    }
  }, [expandedArticleId, onRequestSummary]);

  // Lock body scroll when panel is open
  useEffect(() => {
    if (expandedArticleId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [expandedArticleId]);

  // Find the currently expanded article object
  const expandedArticle = expandedArticleId
    ? articles.find((a) => a.id === expandedArticleId)
    : null;

  // Keyboard: Esc closes expanded article
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && expandedArticleId) {
        setExpandedArticleId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [expandedArticleId]);

  // Scroll panel content to top when switching articles
  useEffect(() => {
    if (expandedArticleId && expandedRef.current) {
      expandedRef.current.scrollTop = 0;
    }
  }, [expandedArticleId]);

  // Auto-mark article as read after 2s in slide-over panel
  useEffect(() => {
    if (!expandedArticleId) return;
    const timer = setTimeout(() => {
      markArticleRead(expandedArticleId);
    }, 2000);
    return () => clearTimeout(timer);
  }, [expandedArticleId, markArticleRead]);

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

  // "Caught up" — all top 10 stories (hero + first 9 feed) + digest are read
  const top10 = sortedArticles.slice(0, 10);
  const allTopRead = top10.length > 0 && top10.every(
    (a) => a.isRead || readArticleIds.includes(a.id)
  );
  const isCaughtUp = allTopRead && digestReadToday && !caughtUpDismissed;

  // Pre-compute coverage density for all articles
  const coverageMap = useMemo(() => {
    const map = new Map<string, { count: number; sources: string[] }>();
    for (const a of articles) {
      map.set(a.id, findCoverageDensity(a, articles));
    }
    return map;
  }, [articles]);

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

      {/* Feed action buttons are now in the header nav bar */}

      {/* ═══ CAUGHT UP BANNER ═══ */}
      {isCaughtUp && (
        <section className="pb-8 border-b border-border-primary">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle size={40} className="text-accent-success mb-4" />
            <h2 className="font-serif text-2xl font-bold text-text-primary mb-2">
              You&apos;re Caught Up
            </h2>
            <p className="text-sm text-text-secondary max-w-md">
              You&apos;ve read today&apos;s top stories and daily digest. New stories will appear as they arrive.
            </p>
            <button
              onClick={() => setCaughtUpDismissed(true)}
              className="mt-4 text-xs text-text-tertiary hover:text-text-primary transition-colors"
            >
              Dismiss
            </button>
          </div>
        </section>
      )}

      {/* ═══ HERO STORY ═══ */}
      {heroArticle && !isCaughtUp && (
        <section className="pb-8 border-b border-border-primary">
          <div
            className="flex flex-col md:flex-row gap-6 md:gap-8 cursor-pointer group"
            onClick={() => onOpenReader(heroArticle)}
          >
            {/* Mobile: image on top */}
            {heroArticle.imageUrl && (
              <div className="md:hidden w-full overflow-hidden">
                <img
                  src={heroArticle.imageUrl}
                  alt=""
                  className="w-full max-h-[250px] object-cover hero-image-zoom"
                />
              </div>
            )}
            {/* Text side ~55% */}
            <div className="flex-1 md:w-[55%] flex flex-col justify-center">
              <p className="mb-3 flex items-center gap-2 typo-section-label text-text-secondary">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: "var(--accent-primary)" }}
                />
                Top Story For You
              </p>
              {/* Category pills */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] uppercase tracking-[0.08em] border border-border-primary px-2 py-0.5 text-text-secondary">
                  {topicLabels[heroArticle.topic]}
                </span>
                <span className="text-[10px] uppercase tracking-[0.08em] border border-border-primary px-2 py-0.5 text-text-secondary">
                  {heroArticle.readingTimeMinutes} min read
                </span>
              </div>
              <h1 className="typo-hero text-3xl md:text-4xl lg:text-[3.5rem] xl:text-[4rem] text-text-primary mb-4 group-hover:text-accent-primary transition-colors">
                {heroArticle.title}
              </h1>
              {heroArticle.summary?.brief && (
                <p className="font-sans text-lg text-text-secondary mb-4 line-clamp-3">
                  {heroArticle.summary.brief}
                </p>
              )}
              {heroTopics.length > 0 && (
                <p className="text-[13px] text-text-secondary italic mb-4">
                  Based on your interest in{" "}
                  {heroTopics.map((t, i) => (
                    <span key={t}>
                      {i > 0 && " and "}
                      <span className="font-semibold">{t}</span>
                    </span>
                  ))}
                </p>
              )}
            </div>
            {/* Image side ~45% — desktop only */}
            {heroArticle.imageUrl && (
              <div className="hidden md:block md:w-[45%] overflow-hidden">
                <img
                  src={heroArticle.imageUrl}
                  alt=""
                  className="w-full h-full object-cover hero-image-zoom"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══ TOPIC FILTER TABS ═══ */}
      <section className="py-4 border-b border-border-primary relative">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide tab-scroll-container">
          <button
            onClick={() => {
              setActiveTab("all");
              setVisibleCount(ITEMS_PER_PAGE);
            }}
            className={`pb-3 text-sm font-sans whitespace-nowrap transition-colors tab-underline ${
              activeTab === "all"
                ? "text-text-primary font-semibold tab-underline-active"
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
              className={`pb-3 text-sm font-sans whitespace-nowrap transition-colors tab-underline ${
                activeTab === topic
                  ? "text-text-primary font-semibold tab-underline-active"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {topicLabels[topic]}
            </button>
          ))}
        </div>
      </section>

      {/* ═══ FEED LIST ═══ */}
      <section key={activeTab} className="content-crossfade">
        {visibleFeedArticles.map((article) => {
          const curation = getCurationReason(article);
          const isExpanded = expandedArticleId === article.id;
          const isRead = article.isRead || readArticleIds.includes(article.id);
          const sourceType = getSourceType(article.source, article.documentType);
          const sourceConfig = getSourceTypeConfig(sourceType);
          const coverage = coverageMap.get(article.id);
          const isPrimary = sourceType === "primary";
          return (
            <div
              key={article.id}
              className={`border-b border-border-primary feed-item-row rounded-sm feed-item-enter transition-opacity duration-300 ${isRead ? "opacity-55" : ""} ${isPrimary ? "feed-item-primary" : ""}`}
              style={{ animationDelay: `${feedArticles.indexOf(article) * 50}ms` }}
            >
              <div
                className="flex items-start gap-4 py-6 px-4 md:py-8 md:px-0 cursor-pointer group"
                onClick={() => handleArticleClick(article)}
                data-feed-index={feedArticles.indexOf(article)}
              >
                {/* Left side */}
                <div className="flex-1 min-w-0">
                  {/* Line 1: dot + topic + timestamp */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`topic-dot ${isRead ? "topic-dot-read" : ""}`}
                      style={{
                        backgroundColor: isRead ? "transparent" : topicDotColors[article.topic],
                        borderColor: topicDotColors[article.topic],
                      }}
                    />
                    <span className="text-xs uppercase tracking-[0.08em] text-text-secondary">
                      {topicLabels[article.topic]}
                    </span>
                    <span className="text-xs text-accent-primary">·</span>
                    <span className="text-xs uppercase tracking-[0.08em] text-text-secondary">
                      {formatArticleTime(article.publishedAt)}
                    </span>
                  </div>
                  {/* Line 2: headline */}
                  <h3
                    className="typo-feed-headline feed-headline text-[22px] md:text-[24px] text-text-primary mb-1.5 transition-colors"
                  >
                    {article.title}
                  </h3>
                  {/* Line 3: summary (hidden when expanded) */}
                  {!isExpanded && (article.summary?.brief || article.content) && (
                    <p className="typo-body text-text-secondary line-clamp-2 mb-2">
                      {article.summary?.brief ||
                        article.content?.slice(0, 200)}
                    </p>
                  )}
                  {/* Line 4: source + source type + coverage density */}
                  <div className="flex items-center gap-1.5 typo-metadata flex-wrap">
                    <span>
                      {isPrimary && article.documentType
                        ? `${article.source} · ${article.documentType}`
                        : article.source}
                    </span>
                    {/* Source type badge */}
                    {sourceConfig.icon && (
                      <span
                        className="inline-flex items-center gap-0.5"
                        style={{ color: sourceConfig.color }}
                      >
                        <span>{sourceConfig.icon}</span>
                        {sourceConfig.label && (
                          <span className="text-[10px] uppercase tracking-[0.05em] font-semibold">
                            {sourceConfig.label}
                          </span>
                        )}
                      </span>
                    )}
                    {/* Coverage density */}
                    {coverage && coverage.count >= 3 && (
                      <>
                        <span className="text-text-tertiary">·</span>
                        <span className="text-text-tertiary normal-case">
                          Widely covered · {coverage.count} sources
                        </span>
                      </>
                    )}
                    {coverage && coverage.count === 1 && (
                      <>
                        <span className="text-text-tertiary">·</span>
                        <span className="normal-case">
                          <span className="font-medium">Only in:</span>{" "}
                          <span className="text-text-tertiary">{article.source}</span>
                        </span>
                      </>
                    )}
                    {/* Curation reason */}
                    {curation && (
                      <>
                        <span className="text-accent-primary">•</span>
                        <span className="italic normal-case">{curation}</span>
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
                  className={`flex-shrink-0 mt-2 p-1.5 text-text-secondary hover:text-text-primary transition-colors feed-save-icon ${article.isSaved ? "!opacity-100" : ""}`}
                  title={article.isSaved ? "Unsave" : "Save"}
                >
                  <Bookmark
                    size={18}
                    className={article.isSaved ? "fill-current" : ""}
                  />
                </button>
              </div>

              {/* Article expansion now rendered as slide-over panel below */}
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
        <div className="p-16 text-center">
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

      {/* ═══ SLIDE-OVER PANEL ═══ */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-250 ease-out ${
          expandedArticle ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setExpandedArticleId(null)}
      />
      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full md:w-[550px] bg-bg-card shadow-xl transition-transform duration-250 ease-out ${
          expandedArticle ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {expandedArticle && (
          <div className="h-full flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
              <div className="flex items-center gap-2">
                <span
                  className="topic-dot"
                  style={{ backgroundColor: topicDotColors[expandedArticle.topic] }}
                />
                <span className="typo-section-label text-text-secondary">
                  {topicLabels[expandedArticle.topic]}
                </span>
                <span className="text-xs text-text-tertiary">·</span>
                <span className="text-xs text-text-secondary">
                  {formatArticleTime(expandedArticle.publishedAt)}
                </span>
              </div>
              <button
                onClick={() => setExpandedArticleId(null)}
                className="p-1.5 text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Close panel"
              >
                <X size={18} />
              </button>
            </div>

            {/* Panel title + source context bar */}
            <div className="px-6 pt-5 pb-2">
              <h2 className="font-serif text-xl font-bold text-text-primary leading-snug">
                {expandedArticle.title}
              </h2>
              {/* Source context bar */}
              {(() => {
                const st = getSourceType(expandedArticle.source, expandedArticle.documentType);
                const sc = getSourceTypeConfig(st);
                const cov = coverageMap.get(expandedArticle.id);
                return (
                  <div className="mt-3 flex items-center gap-3">
                    {/* First-letter avatar */}
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: "var(--accent-primary)" }}
                    >
                      {expandedArticle.source.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-text-primary">
                          {expandedArticle.source}
                        </span>
                        {sc.icon && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-[0.05em]"
                            style={{ color: sc.color }}
                          >
                            {sc.icon} {sc.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                        <span>Published {formatArticleTime(expandedArticle.publishedAt)}</span>
                        <span>·</span>
                        <span>{expandedArticle.readingTimeMinutes} min read</span>
                        {cov && cov.sources.length > 0 && (
                          <>
                            <span>·</span>
                            <span>Also covered by: {cov.sources.slice(0, 3).join(", ")}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
              {/* Primary source: View Original Filing button */}
              {expandedArticle.documentType && (
                <a
                  href={expandedArticle.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-accent-primary px-3 py-1.5 text-xs font-medium text-accent-primary hover:bg-accent-primary hover:text-text-inverse transition-colors"
                >
                  <ExternalLink size={13} />
                  View Original Filing →
                </a>
              )}
            </div>

            {/* Panel scrollable content */}
            <div ref={expandedRef} className="flex-1 overflow-y-auto px-6 pb-8">
              {isLoadingExpanded ? (
                <div className="flex items-center gap-3 text-text-tertiary py-8">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-sm">Generating AI summary...</span>
                </div>
              ) : expandedArticle.summary ? (
                <ExpandedArticleView
                  summary={expandedArticle.summary}
                  onOpenFull={(e) => {
                    e?.stopPropagation();
                    markArticleRead(expandedArticle.id);
                    onOpenReader(expandedArticle);
                  }}
                  onOpenSource={() => markArticleRead(expandedArticle.id)}
                  sourceUrl={expandedArticle.sourceUrl}
                  articleId={expandedArticle.id}
                  intelligence={(expandedArticle as ArticleWithIntelligence).intelligence}
                  signals={(expandedArticle as ArticleWithIntelligence).signals}
                  articleTitle={expandedArticle.title}
                  articleContent={expandedArticle.content}
                  onSave={() => onSave(expandedArticle.id)}
                  onDismiss={() => setExpandedArticleId(null)}
                  isSaved={expandedArticle.isSaved}
                />
              ) : (
                <div className="py-4">
                  <p className="text-sm text-text-secondary mb-4">
                    {expandedArticle.content?.slice(0, 300)}
                  </p>
                  <a
                    href={expandedArticle.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-primary hover:underline"
                  >
                    Read Full Article <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
