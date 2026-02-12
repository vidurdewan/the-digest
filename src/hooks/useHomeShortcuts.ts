"use client";

import { useCallback } from "react";
import { useFeedNavigationStore } from "@/lib/store";
import type { Article, Summary } from "@/types";

interface UseHomeShortcutsProps {
  rankedArticles: (Article & { summary?: Summary })[];
  handleSave: (id: string) => void;
  handleMarkAllRead: (articleIds: string[]) => void;
  setReaderArticle: (article: (Article & { summary?: Summary }) | null) => void;
}

export function useHomeShortcuts({
  rankedArticles,
  handleSave,
  handleMarkAllRead,
  setReaderArticle,
}: UseHomeShortcutsProps) {
  const handleSaveFocused = useCallback(() => {
    const idx = useFeedNavigationStore.getState().focusedIndex;
    if (idx < 0 || idx >= rankedArticles.length) return;
    handleSave(rankedArticles[idx].id);
  }, [rankedArticles, handleSave]);

  const handleExpandFocused = useCallback(() => {
    const idx = useFeedNavigationStore.getState().focusedIndex;
    if (idx < 0) return;
    const elements = document.querySelectorAll("[data-feed-index]");
    const el = elements[idx] as HTMLElement | undefined;
    if (el) el.click();
  }, []);

  const handleOpenReaderFocused = useCallback(() => {
    const idx = useFeedNavigationStore.getState().focusedIndex;
    if (idx < 0) return;
    const elements = document.querySelectorAll("[data-feed-index]");
    const el = elements[idx] as HTMLElement | undefined;
    if (el) el.click();
  }, []);

  const handleCloseReader = useCallback(() => {
    setReaderArticle(null);
  }, [setReaderArticle]);

  const handleMarkReadFocused = useCallback(() => {
    const idx = useFeedNavigationStore.getState().focusedIndex;
    if (idx < 0 || idx >= rankedArticles.length) return;
    const article = rankedArticles[idx];
    if (!article.isRead) {
      handleMarkAllRead([article.id]);
    }
  }, [rankedArticles, handleMarkAllRead]);

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

  return {
    handleSaveFocused,
    handleExpandFocused,
    handleOpenReaderFocused,
    handleCloseReader,
    handleMarkReadFocused,
    handleDismissFocused,
    handleOpenSourceUrlFocused,
  };
}
