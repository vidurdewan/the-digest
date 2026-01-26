"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { MobileNav } from "@/components/layout/MobileNav";
import { useSidebarStore } from "@/lib/store";
import { useToastStore } from "@/components/ui/Toast";
import {
  topicLabels,
} from "@/lib/mock-data";
import type { Article, Summary, TopicCategory } from "@/types";
import { useNewsletters } from "@/hooks/useNewsletters";
import { useGmailStatus } from "@/hooks/useGmailStatus";
import { useArticles } from "@/hooks/useArticles";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useEngagement } from "@/hooks/useEngagement";
import { usePreferences } from "@/hooks/usePreferences";
import { rankArticles } from "@/lib/ranking";

// Section components
import { IntelligenceFeed } from "@/components/feed/IntelligenceFeed";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { TopicSection } from "@/components/articles/TopicSection";
import { FullReaderView } from "@/components/articles/FullReaderView";
import { NewsletterView } from "@/components/articles/NewsletterView";
import { SavedView } from "@/components/articles/SavedView";
import { SearchView } from "@/components/search/SearchBar";
import { WatchlistView } from "@/components/watchlist/WatchlistView";
import { SettingsView } from "@/components/settings/SettingsView";
import { SourceManager } from "@/components/settings/SourceManager";
import { PageSkeleton } from "@/components/ui/LoadingSkeleton";
import { PeopleMovesView } from "@/components/intelligence/PeopleMovesView";
import { CompanyView } from "@/components/intelligence/CompanyView";
import { ChatView } from "@/components/intelligence/ChatView";
import { BriefMeView } from "@/components/intelligence/BriefMeView";
import { WeeklySynthesisView } from "@/components/intelligence/WeeklySynthesisView";
import {
  OnboardingWizard,
  type OnboardingData,
} from "@/components/onboarding/OnboardingWizard";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { KeyboardShortcutHandler } from "@/components/ui/KeyboardShortcutHandler";
import { useFeedNavigationStore } from "@/lib/store";

import {
  Zap,
  Mail,
  TrendingUp,
  Eye,
  Bookmark,
  RefreshCw,
} from "lucide-react";

// ─── Priority Feed ──────────────────────────────────────────
function PriorityFeedSection({
  articles,
  onSave,
  onOpenReader,
  onRequestSummary,
  onExpand,
}: {
  articles: (Article & { summary?: Summary })[];
  onSave: (id: string) => void;
  onOpenReader: (article: Article & { summary?: Summary }) => void;
  onRequestSummary?: (
    article: Article & { summary?: Summary }
  ) => Promise<Summary | null>;
  onExpand?: (articleId: string) => void;
}) {
  const unread = articles.filter((a) => !a.isRead).length;
  const watchlistCount = articles.filter(
    (a) => a.watchlistMatches.length > 0
  ).length;
  const savedCount = articles.filter((a) => a.isSaved).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Zap size={24} className="text-accent-primary" />
        <div>
          <h2 className="text-2xl font-bold text-text-primary">
            Priority Feed
          </h2>
          <p className="text-sm text-text-tertiary">
            AI-curated top stories across all your sources
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {[
          { label: "Unread", value: unread.toString(), icon: Mail },
          {
            label: "Trending",
            value: articles.length.toString(),
            icon: TrendingUp,
          },
          { label: "Watchlist", value: watchlistCount.toString(), icon: Eye },
          { label: "Saved", value: savedCount.toString(), icon: Bookmark },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex min-w-[130px] items-center gap-3 rounded-lg border border-border-primary bg-bg-card p-3 transition-theme"
          >
            <stat.icon size={18} className="shrink-0 text-accent-primary" />
            <div>
              <p className="text-lg font-bold text-text-primary">
                {stat.value}
              </p>
              <p className="text-xs text-text-tertiary">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Articles */}
      <div className="space-y-3">
        {articles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            onSave={onSave}
            onOpenReader={onOpenReader}
            onRequestSummary={onRequestSummary}
            onExpand={onExpand}
          />
        ))}
      </div>
    </div>
  );
}

// ─── News by Topic ──────────────────────────────────────────
function NewsByTopicSection({
  articles,
  onSave,
  onOpenReader,
  onRequestSummary,
  onExpand,
  onIngest,
  isIngesting,
}: {
  articles: (Article & { summary?: Summary })[];
  onSave: (id: string) => void;
  onOpenReader: (article: Article & { summary?: Summary }) => void;
  onRequestSummary?: (
    article: Article & { summary?: Summary }
  ) => Promise<Summary | null>;
  onExpand?: (articleId: string) => void;
  onIngest?: () => void;
  isIngesting?: boolean;
}) {
  // Group by topic
  const topics = Object.keys(topicLabels) as TopicCategory[];
  const grouped = topics.reduce(
    (acc, topic) => {
      acc[topic] = articles.filter((a) => a.topic === topic);
      return acc;
    },
    {} as Record<TopicCategory, (Article & { summary?: Summary })[]>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp size={24} className="text-accent-primary" />
          <div>
            <h2 className="text-2xl font-bold text-text-primary">
              News by Topic
            </h2>
            <p className="text-sm text-text-tertiary">
              Browse by category — click to expand
            </p>
          </div>
        </div>
        {onIngest && (
          <button
            onClick={onIngest}
            disabled={isIngesting}
            className="flex items-center gap-1.5 rounded-lg bg-accent-primary px-3 py-2 text-sm font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={isIngesting ? "animate-spin" : ""}
            />
            {isIngesting ? "Fetching..." : "Fetch News"}
          </button>
        )}
      </div>

      <div className="space-y-6">
        {topics
          .filter((t) => grouped[t].length > 0)
          .map((topic) => (
            <TopicSection
              key={topic}
              topic={topic}
              articles={grouped[topic]}
              onSave={onSave}
              onOpenReader={onOpenReader}
              onRequestSummary={onRequestSummary}
              onExpand={onExpand}
              defaultOpen={true}
            />
          ))}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function Home() {
  const activeSection = useSidebarStore((state) => state.activeSection);
  const { addToast } = useToastStore();
  const [readerArticle, setReaderArticle] = useState<
    (Article & { summary?: Summary }) | null
  >(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Service worker registration (push notifications + offline)
  useServiceWorker();

  // Data hooks
  const newsletterData = useNewsletters();
  const gmailStatus = useGmailStatus();
  const articleData = useArticles();
  const autoRefresh = useAutoRefresh();
  const watchlist = useWatchlist();
  const engagement = useEngagement();
  const preferences = usePreferences();

  // Wire auto-refresh to article data refresh
  useEffect(() => {
    autoRefresh.setRefreshFn(articleData.refresh);
  }, [autoRefresh.setRefreshFn, articleData.refresh]);

  // Show onboarding on first visit
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasOnboarded = localStorage.getItem("the-digest-onboarded");
      if (!hasOnboarded) {
        setShowOnboarding(true);
      }
    }
  }, []);

  const handleOnboardingComplete = async (data: OnboardingData) => {
    // Save topic preferences
    for (const [topic, level] of Object.entries(data.topicPreferences)) {
      preferences.setTopicLevel(
        topic as import("@/types").TopicCategory,
        level
      );
    }
    await preferences.save();

    // Add watchlist items
    for (const item of data.watchlistItems) {
      await watchlist.addItem(item, "company");
    }

    localStorage.setItem("the-digest-onboarded", "true");
    setShowOnboarding(false);
    addToast("Welcome to The Digest! Your feed is ready.", "success");
  };

  const handleOnboardingSkip = () => {
    localStorage.setItem("the-digest-onboarded", "true");
    setShowOnboarding(false);
  };

  // Apply watchlist matching to articles
  const articlesWithMatches = useMemo(
    () => watchlist.matchArticles(articleData.articles),
    [watchlist, articleData.articles]
  );

  // Ranked articles for Priority Feed
  const rankedArticles = useMemo(
    () =>
      rankArticles(articlesWithMatches, {
        topicPreferences: preferences.preferences,
        topicEngagementScores: engagement.topicScores,
      }),
    [articlesWithMatches, preferences.preferences, engagement.topicScores]
  );

  // Show skeleton only while initial article fetch is in progress
  const isLoading = articleData.isLoading && articleData.articles.length === 0;

  const handleSave = (id: string) => {
    const article = articlesWithMatches.find((a) => a.id === id);
    if (article) {
      engagement.trackEvent(id, "save");
      addToast(
        article.isSaved
          ? `Removed "${article.title.slice(0, 40)}..." from saved`
          : `Saved "${article.title.slice(0, 40)}..."`,
        article.isSaved ? "info" : "success"
      );
    }
  };

  const handleForceRefresh = async () => {
    const result = await articleData.ingest();
    if (result) {
      addToast(
        `Fetched ${result.totalFetched} articles, stored ${result.totalStored}`,
        "success"
      );
    }
  };

  const handleOpenReader = (article: Article & { summary?: Summary }) => {
    engagement.trackEvent(article.id, "read");
    setReaderArticle(article);
  };

  const handleExpand = (articleId: string) => {
    engagement.trackEvent(articleId, "expand");
  };

  // Keyboard shortcut callbacks
  const handleSaveFocused = useCallback(() => {
    const idx = useFeedNavigationStore.getState().focusedIndex;
    if (idx < 0 || idx >= rankedArticles.length) return;
    handleSave(rankedArticles[idx].id);
  }, [rankedArticles]);

  const handleExpandFocused = useCallback(() => {
    const idx = useFeedNavigationStore.getState().focusedIndex;
    if (idx < 0) return;
    // Simulate a click on the focused card to expand it
    const elements = document.querySelectorAll("[data-feed-index]");
    const el = elements[idx] as HTMLElement | undefined;
    if (el) el.click();
  }, []);

  const handleCloseReader = useCallback(() => {
    setReaderArticle(null);
  }, []);

  const renderSection = () => {
    if (isLoading) return <PageSkeleton />;

    switch (activeSection) {
      case "priority-feed":
        return (
          <IntelligenceFeed
            articles={rankedArticles}
            onSave={handleSave}
            onOpenReader={handleOpenReader}
            onRequestSummary={articleData.requestFullSummary}
            onExpand={handleExpand}
            newCount={autoRefresh.newCount}
            onShowNew={autoRefresh.showNew}
            lastUpdated={autoRefresh.lastUpdated}
            onForceRefresh={handleForceRefresh}
            isRefreshing={articleData.isIngesting}
          />
        );
      case "newsletters":
        return (
          <NewsletterView
            newsletters={newsletterData.newsletters}
            isLoading={newsletterData.isLoading}
            error={newsletterData.error}
            onRefresh={newsletterData.refresh}
            onIngest={newsletterData.ingest}
            isIngesting={newsletterData.isIngesting}
            isGmailConnected={gmailStatus.isConnected}
            onConnectGmail={gmailStatus.connect}
            dailyDigest={newsletterData.dailyDigest}
            isGeneratingDigest={newsletterData.isGeneratingDigest}
            onGenerateDigest={newsletterData.generateDigest}
            digestHistory={newsletterData.digestHistory}
            selectedDigestDate={newsletterData.selectedDigestDate}
            onSelectDigestDate={newsletterData.selectDigestDate}
            onToggleRead={newsletterData.toggleRead}
            onToggleSave={newsletterData.toggleSave}
          />
        );
      case "news":
        return (
          <NewsByTopicSection
            articles={articlesWithMatches}
            onSave={handleSave}
            onOpenReader={handleOpenReader}
            onRequestSummary={articleData.requestFullSummary}
            onExpand={handleExpand}
            onIngest={handleForceRefresh}
            isIngesting={articleData.isIngesting}
          />
        );
      case "watchlist":
        return (
          <WatchlistView
            watchlist={watchlist.items}
            articles={articlesWithMatches}
            onSave={handleSave}
            onOpenReader={handleOpenReader}
            onRequestSummary={articleData.requestFullSummary}
            onAddItem={watchlist.addItem}
            onRemoveItem={watchlist.removeItem}
            onExpand={handleExpand}
          />
        );
      case "saved":
        return (
          <SavedView
            articles={articlesWithMatches}
            onSave={handleSave}
            onOpenReader={handleOpenReader}
            onRequestSummary={articleData.requestFullSummary}
            onExpand={handleExpand}
          />
        );
      case "search":
        return (
          <SearchView
            articles={articlesWithMatches}
            onSave={handleSave}
            onOpenReader={handleOpenReader}
            onRequestSummary={articleData.requestFullSummary}
            onExpand={handleExpand}
          />
        );
      case "people-moves":
        return (
          <PeopleMovesView
            articles={articlesWithMatches}
            onOpenReader={handleOpenReader}
          />
        );
      case "companies":
        return (
          <CompanyView
            articles={articlesWithMatches}
            onSave={handleSave}
            onOpenReader={handleOpenReader}
            onRequestSummary={articleData.requestFullSummary}
            onExpand={handleExpand}
          />
        );
      case "chat":
        return <ChatView articles={articlesWithMatches} />;
      case "brief":
        return <BriefMeView articles={articlesWithMatches} />;
      case "weekly-synthesis":
        return <WeeklySynthesisView />;
      case "sources":
        return <SourceManager />;
      case "settings":
        return <SettingsView />;
      default:
        return (
          <IntelligenceFeed
            articles={rankedArticles}
            onSave={handleSave}
            onOpenReader={handleOpenReader}
            onRequestSummary={articleData.requestFullSummary}
            onExpand={handleExpand}
            newCount={autoRefresh.newCount}
            onShowNew={autoRefresh.showNew}
            lastUpdated={autoRefresh.lastUpdated}
            onForceRefresh={handleForceRefresh}
            isRefreshing={articleData.isIngesting}
          />
        );
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-5xl pb-20 lg:pb-0">
        {renderSection()}
      </div>
      <MobileNav />
      <FullReaderView
        article={readerArticle}
        onClose={() => setReaderArticle(null)}
      />
      <KeyboardShortcutHandler
        onSaveFocused={handleSaveFocused}
        onExpandFocused={handleExpandFocused}
        onCloseReader={handleCloseReader}
      />
      {showOnboarding && (
        <OnboardingWizard
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
    </MainLayout>
  );
}
