"use client";

import { useState, useEffect, useCallback } from "react";
import type { Article, Summary, TopicCategory, Entity, ArticleIntelligence, ArticleConnection, SignificanceLevel, StoryType } from "@/types";

interface UseArticlesReturn {
  articles: (Article & { summary?: Summary; intelligence?: ArticleIntelligence })[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  ingest: (options?: {
    scrape?: boolean;
  }) => Promise<{ totalFetched: number; totalStored: number } | null>;
  isIngesting: boolean;
  requestFullSummary: (
    article: Article & { summary?: Summary }
  ) => Promise<Summary | null>;
  isSummarizing: boolean;
}

// Map Supabase summary row to Summary type
interface DbSummaryRow {
  id: string;
  brief: string | null;
  the_news: string | null;
  why_it_matters: string | null;
  the_context: string | null;
  key_entities: Entity[] | null;
  generated_at: string | null;
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
    generatedAt: data.generated_at || "",
  };
}

/**
 * Hook for fetching articles with summaries.
 * Tries to fetch from API (Supabase), falls back to mock data.
 */
export function useArticles(): UseArticlesReturn {
  const [articles, setArticles] =
    useState<(Article & { summary?: Summary; intelligence?: ArticleIntelligence })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/articles?limit=100");
      const data = await res.json();

      if (data.articles && data.articles.length > 0) {
        const mapped: (Article & { summary?: Summary; intelligence?: ArticleIntelligence })[] =
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
              summaries: DbSummaryRow | DbSummaryRow[] | null;
              article_intelligence: DbIntelligenceRow | DbIntelligenceRow[] | null;
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
              isRead: false,
              isSaved: false,
              watchlistMatches: [],
              summary: mapSummary(a.summaries, a.id),
              intelligence: mapIntelligence(a.article_intelligence),
            })
          );
        setArticles(mapped);
      }
    } catch {
      // API unavailable — keep current state
    } finally {
      setIsLoading(false);
    }
  }, []);

  const ingest = useCallback(
    async (options?: { scrape?: boolean }) => {
      setIsIngesting(true);
      setError(null);

      try {
        const scrapeParam = options?.scrape ? "&scrape=true" : "";
        const res = await fetch(`/api/ingest/news?${scrapeParam}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to ingest news");
          return null;
        }

        // Refresh article list after ingestion
        await fetchArticles();

        return {
          totalFetched: data.totalFetched as number,
          totalStored: data.totalStored as number,
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
