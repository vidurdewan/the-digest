"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useSidebarStore } from "@/lib/store";
import { useToastStore } from "@/components/ui/Toast";
import type { Article, Summary } from "@/types";
import { useNewsletters } from "@/hooks/useNewsletters";
import { useGmailStatus } from "@/hooks/useGmailStatus";
import { useArticles } from "@/hooks/useArticles";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useEngagement } from "@/hooks/useEngagement";
import { usePreferences } from "@/hooks/usePreferences";
import { useHomeShortcuts } from "@/hooks/useHomeShortcuts";
import { rankArticles } from "@/lib/ranking";

// Section components
import { IntelligenceFeed } from "@/components/feed/IntelligenceFeed";
import { NewsByTopicSection } from "@/components/articles/NewsByTopicSection";
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

  const setAutoRefreshFn = autoRefresh.setRefreshFn;

  useEffect(() => {
    setAutoRefreshFn(articleData.refresh);
  }, [setAutoRefreshFn, articleData.refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasOnboarded = localStorage.getItem("the-digest-onboarded");
    if (!hasOnboarded) {
      const frame = requestAnimationFrame(() => setShowOnboarding(true));
      return () => cancelAnimationFrame(frame);
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

  const handleSave = useCallback((id: string) => {
    articleData.toggleSave(id);
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
  }, [articleData, articlesWithMatches, engagement, addToast]);

  const handleMarkAllRead = useCallback((articleIds: string[]) => {
    const unreadIds = articleIds.filter(
      (id) => articlesWithMatches.find((a) => a.id === id && !a.isRead)
    );
    if (unreadIds.length === 0) return;
    articleData.markAsRead(unreadIds);
    for (const id of unreadIds) {
      engagement.trackEvent(id, "read");
    }
    for (const id of unreadIds) {
      const dots = document.querySelectorAll(`[data-unread-dot="${id}"]`);
      dots.forEach((dot) => dot.classList.add("unread-dot-fade"));
    }
    addToast(`Marked ${unreadIds.length} article${unreadIds.length === 1 ? "" : "s"} as read`, "success");
  }, [articlesWithMatches, articleData, engagement, addToast]);

  const handleForceRefresh = async () => {
    const result = await articleData.ingest();
    if (result) {
      const hasErrors = result.totalErrors > 0 || result.errorMessages.length > 0;
      if (hasErrors && result.totalStored === 0) {
        const detail = result.errorMessages[0] || "Unknown database error";
        addToast(
          `Fetched ${result.totalFetched} articles but failed to store: ${detail}`,
          "error"
        );
      } else if (hasErrors) {
        addToast(
          `Fetched ${result.totalFetched} articles, stored ${result.totalStored} (${result.totalErrors} errors)`,
          "info"
        );
      } else {
        addToast(
          `Fetched ${result.totalFetched} articles, stored ${result.totalStored}`,
          "success"
        );
      }
    } else if (articleData.error) {
      addToast(`Refresh failed: ${articleData.error}`, "error");
    }
  };

  const handleOpenReader = useCallback((article: Article & { summary?: Summary }) => {
    engagement.trackEvent(article.id, "read");
    setReaderArticle(article);
  }, [engagement]);

  const handleExpand = (articleId: string) => {
    engagement.trackEvent(articleId, "expand");
  };

  // Keyboard shortcuts (extracted to hook)
  const shortcuts = useHomeShortcuts({
    rankedArticles,
    handleSave,
    handleMarkAllRead,
    setReaderArticle,
  });

  // Briefing mode state
  const [briefingMode, setBriefingMode] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const handleToggleBriefing = useCallback(() => {
    setBriefingMode((prev) => !prev);
  }, []);

  const handlePanelStateChange = useCallback((isOpen: boolean) => {
    setIsPanelOpen(isOpen);
  }, []);

  const handleNavigateToArticle = useCallback(
    (articleId: string) => {
      const article = articlesWithMatches.find((a) => a.id === articleId);
      if (article) handleOpenReader(article);
    },
    [articlesWithMatches, handleOpenReader]
  );

  const renderSection = () => {
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
            onForceRefresh={handleForceRefresh}
            isRefreshing={articleData.isIngesting}
            onPanelStateChange={handlePanelStateChange}
            error={articleData.error}
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
            onForceRefresh={handleForceRefresh}
            isRefreshing={articleData.isIngesting}
            onPanelStateChange={handlePanelStateChange}
            error={articleData.error}
          />
        );
    }
  };

  return (
    <MainLayout
      headerProps={{
        articles: articlesWithMatches,
        newsletters: newsletterData.newsletters,
        onNavigateToArticle: handleNavigateToArticle,
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
      {readerArticle && (
        <ReadingPane
          article={readerArticle}
          onClose={shortcuts.handleCloseReader}
          onSave={handleSave}
          onRequestSummary={articleData.requestFullSummary}
        />
      )}
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
        onSaveFocused={shortcuts.handleSaveFocused}
        onExpandFocused={shortcuts.handleExpandFocused}
        onOpenSourceUrlFocused={shortcuts.handleOpenSourceUrlFocused}
        onCloseReader={shortcuts.handleCloseReader}
        onMarkReadFocused={shortcuts.handleMarkReadFocused}
        onDismissFocused={shortcuts.handleDismissFocused}
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
