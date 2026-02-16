"use client";

import { useState, useEffect, useCallback } from "react";
import type { Article, Summary, TopicCategory, Entity, ArticleIntelligence, ArticleConnection, SignificanceLevel, StoryType, ArticleSignal, DecipheringSummary } from "@/types";

// Persistent saved article IDs in localStorage
const SAVED_KEY = "the-digest-saved-articles";
const READ_KEY = "the-digest-read-articles";

function getSavedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(SAVED_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch { return new Set(); }
}

function persistSavedIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SAVED_KEY, JSON.stringify([...ids]));
}

function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(READ_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch { return new Set(); }
}

function persistReadIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

interface UseArticlesReturn {
  articles: (Article & { summary?: Summary; intelligence?: ArticleIntelligence; signals?: ArticleSignal[] })[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  ingest: (options?: {
    scrape?: boolean;
  }) => Promise<{ totalFetched: number; totalStored: number; totalErrors: number; errorMessages: string[] } | null>;
  isIngesting: boolean;
  requestFullSummary: (
    article: Article & { summary?: Summary }
  ) => Promise<Summary | null>;
  isSummarizing: boolean;
  markAsRead: (articleIds: string[]) => void;
  toggleSave: (articleId: string) => void;
}

// Map Supabase summary row to Summary type
interface DbSummaryRow {
  id: string;
  brief: string | null;
  the_news: string | null;
  why_it_matters: string | null;
  the_context: string | null;
  key_entities: Entity[] | null;
  deciphering: DecipheringSummary | null;
  generated_at: string | null;
}

// Map Supabase signal row
interface DbSignalRow {
  id: string;
  signal_type: string;
  signal_label: string;
  entity_name: string | null;
  confidence: number;
  detected_at: string;
}

// Map Supabase intelligence row to ArticleIntelligence type
interface DbIntelligenceRow {
  significance_score: number | null;
  story_type: string | null;
  connects_to: ArticleConnection[] | null;
  story_thread_id: string | null;
  watch_for_next: string | null;
  is_surprise_candidate: boolean | null;
}

function mapIntelligence(
  row: DbIntelligenceRow | DbIntelligenceRow[] | null
): ArticleIntelligence | undefined {
  const data = Array.isArray(row) ? row[0] : row;
  if (!data || !data.significance_score) return undefined;

  return {
    significanceScore: (data.significance_score || 5) as SignificanceLevel,
    storyType: (data.story_type || 'update') as StoryType,
    connectsTo: (data.connects_to as ArticleConnection[]) || [],
    storyThreadId: data.story_thread_id || undefined,
    watchForNext: data.watch_for_next || undefined,
    isSurpriseCandidate: data.is_surprise_candidate || false,
  };
}

function mapSummary(
  row: DbSummaryRow | DbSummaryRow[] | null,
  articleId: string
): Summary | undefined {
  // Supabase returns single object for unique FK, but may return array
  const data = Array.isArray(row) ? row[0] : row;
  if (!data) return undefined;

  return {
    id: data.id,
    articleId,
    brief: data.brief || "",
    theNews: data.the_news || "",
    whyItMatters: data.why_it_matters || "",
    theContext: data.the_context || "",
    keyEntities: (data.key_entities as Entity[]) || [],
    deciphering: data.deciphering || undefined,
    generatedAt: data.generated_at || "",
  };
}

function mapSignals(
  rows: DbSignalRow | DbSignalRow[] | null
): ArticleSignal[] | undefined {
  if (!rows) return undefined;
  const arr = Array.isArray(rows) ? rows : [rows];
  if (arr.length === 0) return undefined;

  return arr.map((s) => ({
    id: s.id,
    articleId: "",
    signalType: s.signal_type as ArticleSignal["signalType"],
    signalLabel: s.signal_label,
    entityName: s.entity_name || undefined,
    confidence: s.confidence,
    metadata: {},
    detectedAt: s.detected_at,
  }));
}

/**
 * Hook for fetching articles with summaries.
 * Tries to fetch from API (Supabase), falls back to mock data.
 */
export function useArticles(): UseArticlesReturn {
  const [articles, setArticles] =
    useState<(Article & { summary?: Summary; intelligence?: ArticleIntelligence; signals?: ArticleSignal[] })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/articles?limit=100");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || `Failed to fetch articles (${res.status})`);
        return;
      }
      const data = await res.json();

      // Surface configuration issues so the user sees them immediately
      if (data.configured === false && (!data.articles || data.articles.length === 0)) {
        setError("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.");
      }

      if (data.articles && data.articles.length > 0) {
        const readIds = getReadIds();
        const savedIds = getSavedIds();
        const mapped: (Article & { summary?: Summary; intelligence?: ArticleIntelligence; signals?: ArticleSignal[] })[] =
          data.articles.map(
            (a: {
              id: string;
              title: string;
              url: string;
              author: string | null;
              published_at: string;
              topic: TopicCategory;
              content: string | null;
              image_url: string | null;
              reading_time_minutes: number;
              source_tier: number | null;
              document_type: string | null;
              summaries: DbSummaryRow | DbSummaryRow[] | null;
              article_intelligence: DbIntelligenceRow | DbIntelligenceRow[] | null;
              article_signals: DbSignalRow | DbSignalRow[] | null;
            }) => ({
              id: a.id,
              title: a.title,
              source: extractSourceFromUrl(a.url),
              sourceUrl: a.url,
              author: a.author || undefined,
              publishedAt: a.published_at,
              topic: a.topic as TopicCategory,
              content: a.content || undefined,
              imageUrl: a.image_url || undefined,
              readingTimeMinutes: a.reading_time_minutes || 3,
              isRead: readIds.has(a.id),
              isSaved: savedIds.has(a.id),
              watchlistMatches: [],
              sourceTier: (a.source_tier || 3) as Article["sourceTier"],
              documentType: a.document_type as Article["documentType"],
              summary: mapSummary(a.summaries, a.id),
              intelligence: mapIntelligence(a.article_intelligence),
              signals: mapSignals(a.article_signals),
            })
          );
        setArticles(mapped);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch articles";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const ingest = useCallback(
    async (options?: { scrape?: boolean }) => {
      setIsIngesting(true);
      setError(null);

      try {
        const scrapeParam = options?.scrape ? "?scrape=true" : "";
        const res = await fetch(`/api/ingest/news${scrapeParam}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to ingest news");
          return null;
        }

        // Capture storage error before refreshing articles
        // (fetchArticles clears error state, so we must restore it after)
        let storageError: string | null = null;
        if (data.totalStored === 0 && (data.totalErrors > 0 || data.errorMessages?.length > 0)) {
          storageError = data.errorMessages?.[0] || "Unknown database error";
        }

        // Refresh article list after ingestion
        await fetchArticles();

        // Restore the storage error that fetchArticles cleared
        if (storageError) {
          setError(`Storage failed: ${storageError}`);
        }

        return {
          totalFetched: data.totalFetched as number,
          totalStored: data.totalStored as number,
          totalErrors: (data.totalErrors as number) || 0,
          errorMessages: (data.errorMessages as string[]) || [],
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to ingest news";
        setError(message);
        return null;
      } finally {
        setIsIngesting(false);
      }
    },
    [fetchArticles]
  );

  /**
   * Request a full AI summary for a specific article.
   * Called when user expands an article card (Tier 2).
   */
  const requestFullSummary = useCallback(
    async (
      article: Article & { summary?: Summary }
    ): Promise<Summary | null> => {
      // Already have a full summary cached
      if (article.summary?.theNews) {
        return article.summary;
      }

      setIsSummarizing(true);
      try {
        const res = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            articleId: article.id,
            title: article.title,
            content: article.content || "",
            source: article.source,
            tier: "full",
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          console.error("[useArticles] Summary error:", data.error);
          return null;
        }

        const summary = data.summary as Summary;

        // Update the article in local state with the new summary
        setArticles((prev) =>
          prev.map((a) =>
            a.id === article.id ? { ...a, summary } : a
          )
        );

        return summary;
      } catch (err) {
        console.error("[useArticles] Summary request failed:", err);
        return null;
      } finally {
        setIsSummarizing(false);
      }
    },
    []
  );

  const markAsRead = useCallback((articleIds: string[]) => {
    const idSet = new Set(articleIds);
    const readIds = getReadIds();
    for (const id of articleIds) {
      readIds.add(id);
    }
    persistReadIds(readIds);
    setArticles((prev) =>
      prev.map((a) => (idSet.has(a.id) ? { ...a, isRead: true } : a))
    );
  }, []);

  const toggleSave = useCallback((articleId: string) => {
    setArticles((prev) =>
      prev.map((a) => {
        if (a.id !== articleId) return a;
        const newSaved = !a.isSaved;
        // Update localStorage
        const savedIds = getSavedIds();
        if (newSaved) {
          savedIds.add(articleId);
        } else {
          savedIds.delete(articleId);
        }
        persistSavedIds(savedIds);
        return { ...a, isSaved: newSaved };
      })
    );
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  return {
    articles,
    isLoading,
    error,
    refresh: fetchArticles,
    ingest,
    isIngesting,
    requestFullSummary,
    isSummarizing,
    markAsRead,
    toggleSave,
  };
}

function extractSourceFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    const domainMap: Record<string, string> = {
      "techcrunch.com": "TechCrunch",
      "arstechnica.com": "Ars Technica",
      "wired.com": "Wired",
      "theverge.com": "The Verge",
      "reuters.com": "Reuters",
      "cnbc.com": "CNBC",
      "fortune.com": "Fortune",
      "politico.com": "Politico",
      "electrek.co": "Electrek",
      "venturebeat.com": "VentureBeat",
      "technologyreview.com": "MIT Tech Review",
    };
    return (
      domainMap[hostname] ||
      hostname
        .replace(/\.(com|org|net|io|co)$/, "")
        .split(".")
        .pop()!
        .charAt(0)
        .toUpperCase() +
        hostname
          .replace(/\.(com|org|net|io|co)$/, "")
          .split(".")
          .pop()!
          .slice(1)
    );
  } catch {
    return "Unknown";
  }
}
