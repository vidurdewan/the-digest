"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { BackToTop } from "@/components/ui/BackToTop";
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
import { ReadingPane } from "@/components/articles/ReadingPane";
import { NewsletterView } from "@/components/articles/NewsletterView";
import { SavedView } from "@/components/articles/SavedView";
import { CommandPalette } from "@/components/CommandPalette";
import { AIChatPanel } from "@/components/AIChatPanel";
import { SearchOverlay } from "@/components/SearchOverlay";
import { SettingsView } from "@/components/settings/SettingsView";
import { SourceManager } from "@/components/settings/SourceManager";
import { PageSkeleton } from "@/components/ui/LoadingSkeleton";
import { IntelligenceView } from "@/components/intelligence/IntelligenceView";
import { BriefMeView } from "@/components/intelligence/BriefMeView";
import { WeeklySynthesisView } from "@/components/intelligence/WeeklySynthesisView";
import {
  OnboardingWizard,
  type OnboardingData,
} from "@/components/onboarding/OnboardingWizard";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { KeyboardShortcutHandler } from "@/components/ui/KeyboardShortcutHandler";
import { ShortcutHintToast } from "@/components/ui/ShortcutHintToast";
import { BriefingOverlay } from "@/components/intelligence/BriefingOverlay";
import { useFeedNavigationStore } from "@/lib/store";

import {
  RefreshCw,
  Search,
} from "lucide-react";

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
  const [searchTerm, setSearchTerm] = useState("");
  const topics = Object.keys(topicLabels) as TopicCategory[];

  const filteredArticles = useMemo(() => {
    if (!searchTerm.trim()) return articles;
    const term = searchTerm.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(term) ||
        a.source.toLowerCase().includes(term) ||
        (a.author && a.author.toLowerCase().includes(term))
    );
  }, [articles, searchTerm]);

  const grouped = topics.reduce(
    (acc, topic) => {
      acc[topic] = filteredArticles.filter((a) => a.topic === topic);
      return acc;
    },
    {} as Record<TopicCategory, (Article & { summary?: Summary })[]>
  );

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between pb-8">
        <div>
          <h2 className="font-serif text-3xl font-bold text-text-primary">
            News by Topic
          </h2>
          <p className="mt-1 text-sm text-text-tertiary">
            Browse by category
          </p>
        </div>
        {onIngest && (
          <button
            onClick={onIngest}
            disabled={isIngesting}
            className="pill-outlined flex items-center gap-1.5 transition-colors hover:bg-bg-hover disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={isIngesting ? "animate-spin" : ""}
            />
            {isIngesting ? "Fetching..." : "Fetch News"}
          </button>
        )}
      </div>

      {/* Search filter */}
      <div className="relative border-b border-border-primary pb-6">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter articles by title, source, or author..."
          className="w-full border-b border-border-secondary bg-transparent pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none transition-colors"
        />
      </div>

      <div className="space-y-0">
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

      {searchTerm && filteredArticles.length === 0 && (
        <p className="text-center text-sm text-text-tertiary py-8">
          No articles match &ldquo;{searchTerm}&rdquo;
        </p>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function Home() {
  const activeSection = useSidebarStore((state) => state.activeSection);
  const setActiveSection = useSidebarStore((state) => state.setActiveSection);
  const { addToast } = useToastStore();
  const [readerArticle, setReaderArticle] = useState<
    (Article & { summary?: Summary }) | null
  >(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useServiceWorker();

  // Data hooks
  const newsletterData = useNewsletters();
  const gmailStatus = useGmailStatus();
  const articleData = useArticles();
  const autoRefresh = useAutoRefresh();
  const watchlist = useWatchlist();
  const engagement = useEngagement();
  const preferences = usePreferences();

  useEffect(() => {
    autoRefresh.setRefreshFn(articleData.refresh);
  }, [autoRefresh.setRefreshFn, articleData.refresh]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasOnboarded = localStorage.getItem("the-digest-onboarded");
      if (!hasOnboarded) {
        setShowOnboarding(true);
      }
    }
  }, []);

  const handleOnboardingComplete = async (data: OnboardingData) => {
    for (const [topic, level] of Object.entries(data.topicPreferences)) {
      preferences.setTopicLevel(
        topic as import("@/types").TopicCategory,
        level
      );
    }
    await preferences.save();
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

  const articlesWithMatches = useMemo(
    () => watchlist.matchArticles(articleData.articles),
    [watchlist, articleData.articles]
  );

  const rankedArticles = useMemo(
    () =>
      rankArticles(articlesWithMatches, {
        topicPreferences: preferences.preferences,
        topicEngagementScores: engagement.topicScores,
      }),
    [articlesWithMatches, preferences.preferences, engagement.topicScores]
  );

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

  const handleMarkAllRead = useCallback((articleIds: string[]) => {
    const unreadIds = articleIds.filter(
      (id) => articlesWithMatches.find((a) => a.id === id && !a.isRead)
    );
    if (unreadIds.length === 0) return;
    articleData.markAsRead(unreadIds);
    for (const id of unreadIds) {
      engagement.trackEvent(id, "read");
    }
    // Trigger unread dot fade via DOM
    for (const id of unreadIds) {
      const dots = document.querySelectorAll(`[data-unread-dot="${id}"]`);
      dots.forEach((dot) => dot.classList.add("unread-dot-fade"));
    }
    addToast(`Marked ${unreadIds.length} article${unreadIds.length === 1 ? "" : "s"} as read`, "success");
  }, [articlesWithMatches, articleData, engagement, addToast]);

  const handleForceRefresh = async () => {
    const result = await articleData.ingest();
    if (result) {
      addToast(
        `Fetched ${result.totalFetched} articles, stored ${result.totalStored}`,
        "success"
      );
    } else if (articleData.error) {
      addToast(`Refresh failed: ${articleData.error}`, "error");
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
    const elements = document.querySelectorAll("[data-feed-index]");
    const el = elements[idx] as HTMLElement | undefined;
    if (el) el.click();
  }, []);

  const handleOpenReaderFocused = useCallback(() => {
    // Enter key now triggers inline expansion via click on feed item
    const idx = useFeedNavigationStore.getState().focusedIndex;
    if (idx < 0) return;
    const elements = document.querySelectorAll("[data-feed-index]");
    const el = elements[idx] as HTMLElement | undefined;
    if (el) el.click();
  }, []);

  const handleCloseReader = useCallback(() => {
    setReaderArticle(null);
  }, []);

  const handleMarkReadFocused = useCallback(() => {
    const idx = useFeedNavigationStore.getState().focusedIndex;
    if (idx < 0 || idx >= rankedArticles.length) return;
    const article = rankedArticles[idx];
    if (!article.isRead) {
      handleMarkAllRead([article.id]);
    }
  }, [rankedArticles, handleMarkAllRead]);

  // Briefing mode state
  const [briefingMode, setBriefingMode] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const handleDismissFocused = useCallback(() => {
    const idx = useFeedNavigationStore.getState().focusedIndex;
    if (idx < 0 || idx >= rankedArticles.length) return;
    const article = rankedArticles[idx];
    if (!article.isRead) {
      handleMarkAllRead([article.id]);
    }
  }, [rankedArticles, handleMarkAllRead]);

  const handleOpenSourceUrlFocused = useCallback(() => {
    const idx = useFeedNavigationStore.getState().focusedIndex;
    if (idx < 0 || idx >= rankedArticles.length) return;
    const article = rankedArticles[idx];
    if (article.sourceUrl) {
      window.open(article.sourceUrl, "_blank", "noopener,noreferrer");
    }
  }, [rankedArticles]);

  const handleToggleBriefing = useCallback(() => {
    setBriefingMode((prev) => !prev);
  }, []);

  const handlePanelStateChange = useCallback((isOpen: boolean) => {
    setIsPanelOpen(isOpen);
  }, []);

  const renderSection = () => {
    // Only show full-page skeleton for feed sections that depend on articles
    if (isLoading && (activeSection === "priority-feed" || activeSection === "news" || activeSection === "intelligence" || activeSection === "saved")) {
      return <PageSkeleton />;
    }

    switch (activeSection) {
      case "priority-feed":
        return (
          <IntelligenceFeed
            articles={rankedArticles}
            newsletters={newsletterData.newsletters}
            onSave={handleSave}
            onOpenReader={handleOpenReader}
            onRequestSummary={articleData.requestFullSummary}
            onExpand={handleExpand}
            newCount={autoRefresh.newCount}
            onShowNew={autoRefresh.showNew}
            lastUpdated={autoRefresh.lastUpdated}
            onForceRefresh={handleForceRefresh}
            isRefreshing={articleData.isIngesting}
            onMarkAllRead={handleMarkAllRead}
            onPanelStateChange={handlePanelStateChange}
          />
        );
      case "newsletters":
        return (
          <NewsletterView
            newsletters={newsletterData.newsletters}
            newslettersForSelectedDate={newsletterData.newslettersForSelectedDate}
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
            vipNewsletters={preferences.vipNewsletters}
            onToggleVip={(publication: string) => {
              if (preferences.vipNewsletters.includes(publication)) {
                preferences.removeVipNewsletter(publication);
              } else {
                preferences.addVipNewsletter(publication);
              }
              preferences.save();
            }}
            articles={articlesWithMatches}
            onNavigateToArticle={handleNavigateToArticle}
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
      case "intelligence":
        return (
          <IntelligenceView
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
            newsletters={newsletterData.newsletters}
            onSave={handleSave}
            onOpenReader={handleOpenReader}
            onRequestSummary={articleData.requestFullSummary}
            onExpand={handleExpand}
            newCount={autoRefresh.newCount}
            onShowNew={autoRefresh.showNew}
            lastUpdated={autoRefresh.lastUpdated}
            onForceRefresh={handleForceRefresh}
            isRefreshing={articleData.isIngesting}
            onMarkAllRead={handleMarkAllRead}
            onPanelStateChange={handlePanelStateChange}
          />
        );
    }
  };

  const handleNavigateToArticle = useCallback(
    (articleId: string) => {
      const article = articlesWithMatches.find((a) => a.id === articleId);
      if (article) handleOpenReader(article);
    },
    [articlesWithMatches]
  );

  return (
    <MainLayout
      headerProps={{
        articles: articlesWithMatches,
        newsletters: newsletterData.newsletters,
        onNavigateToArticle: handleNavigateToArticle,
        unreadNewsletterCount: newsletterData.newsletters.filter((n) => !n.isRead).length,
        onMarkAllRead: handleMarkAllRead,
        onForceRefresh: handleForceRefresh,
        isRefreshing: articleData.isIngesting,
      }}
      newsletters={newsletterData.newsletters}
      articles={articlesWithMatches}
      dailyDigest={newsletterData.dailyDigest}
      isGeneratingDigest={newsletterData.isGeneratingDigest}
      onGenerateDigest={newsletterData.generateDigest}
    >
      <div key={activeSection} className="section-enter mx-auto max-w-5xl pb-8">
        {renderSection()}
      </div>
      {/* Reading pane — slides in as drawer from right */}
      {readerArticle && (
        <ReadingPane
          article={readerArticle}
          onClose={handleCloseReader}
          onSave={handleSave}
          onRequestSummary={articleData.requestFullSummary}
        />
      )}
      <BackToTop />
      <CommandPalette
        articles={rankedArticles}
        onOpenReader={handleOpenReader}
      />
      <AIChatPanel articles={articlesWithMatches} />
      <SearchOverlay
        articles={articlesWithMatches}
        onSave={handleSave}
        onOpenReader={handleOpenReader}
        onRequestSummary={articleData.requestFullSummary}
        onExpand={handleExpand}
      />
      <KeyboardShortcutHandler
        onSaveFocused={handleSaveFocused}
        onExpandFocused={handleExpandFocused}
        onOpenSourceUrlFocused={handleOpenSourceUrlFocused}
        onCloseReader={handleCloseReader}
        onMarkReadFocused={handleMarkReadFocused}
        onDismissFocused={handleDismissFocused}
        onToggleBriefing={handleToggleBriefing}
        isPanelOpen={isPanelOpen}
      />
      <ShortcutHintToast />
      {briefingMode && (
        <BriefingOverlay
          articles={rankedArticles}
          onExit={() => setBriefingMode(false)}
          onOpenFeed={() => setActiveSection("priority-feed")}
          onOpenNewsletters={() => setActiveSection("newsletters")}
        />
      )}
      {showOnboarding && (
        <OnboardingWizard
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
    </MainLayout>
  );
}
