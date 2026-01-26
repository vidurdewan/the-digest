"use client";

import { useState, useEffect, useCallback } from "react";
import type { WatchlistItem, Article, Summary } from "@/types";

interface UseWatchlistReturn {
  items: WatchlistItem[];
  isLoading: boolean;
  addItem: (name: string, type: WatchlistItem["type"]) => Promise<boolean>;
  removeItem: (id: string) => Promise<boolean>;
  matchArticles: (
    articles: (Article & { summary?: Summary })[]
  ) => (Article & { summary?: Summary })[];
}

/**
 * Hook for managing watchlist items and matching articles.
 * Falls back to mock data when API isn't available.
 */
export function useWatchlist(): UseWatchlistReturn {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/watchlist");
      const data = await res.json();

      if (data.items && data.items.length > 0) {
        setItems(data.items);
      }
    } catch {
      // API unavailable — keep current state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = useCallback(
    async (name: string, type: WatchlistItem["type"]): Promise<boolean> => {
      try {
        const res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, type }),
        });
        const data = await res.json();

        if (data.item) {
          setItems((prev) => [data.item, ...prev]);
          return true;
        }
        return false;
      } catch {
        // Fallback: add locally
        const localItem: WatchlistItem = {
          id: `local-${Date.now()}`,
          name,
          type,
          createdAt: new Date().toISOString(),
        };
        setItems((prev) => [localItem, ...prev]);
        return true;
      }
    },
    []
  );

  const removeItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        return true;
      }
      return false;
    } catch {
      // Fallback: remove locally
      setItems((prev) => prev.filter((item) => item.id !== id));
      return true;
    }
  }, []);

  /**
   * Scan articles and populate watchlistMatches based on current watchlist items.
   * Matches against article title, content, source, and entity names.
   */
  const matchArticles = useCallback(
    (
      articles: (Article & { summary?: Summary })[]
    ): (Article & { summary?: Summary })[] => {
      if (items.length === 0) return articles;

      // Build lowercase search terms from watchlist
      const terms = items.map((item) => ({
        name: item.name,
        lower: item.name.toLowerCase(),
      }));

      return articles.map((article) => {
        const matches: string[] = [];
        const searchText = [
          article.title,
          article.content || "",
          article.source,
          article.author || "",
          article.summary?.theNews || "",
          article.summary?.whyItMatters || "",
          article.summary?.theContext || "",
          ...(article.summary?.keyEntities?.map((e) => e.name) || []),
        ]
          .join(" ")
          .toLowerCase();

        for (const term of terms) {
          if (searchText.includes(term.lower)) {
            matches.push(term.name);
          }
        }

        return {
          ...article,
          watchlistMatches: matches,
        };
      });
    },
    [items]
  );

  return { items, isLoading, addItem, removeItem, matchArticles };
}
