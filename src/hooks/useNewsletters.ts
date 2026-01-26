"use client";

import { useState, useEffect, useCallback } from "react";
import type { Newsletter } from "@/types";
import { mockNewsletters } from "@/lib/mock-data";

interface IngestResult {
  fetched: number;
  filtered: number;
  totalEmails: number;
}

interface StoredDigest {
  date: string; // YYYY-MM-DD
  digest: string;
  newsletterCount: number;
  generatedAt: string;
}

interface UseNewslettersReturn {
  newsletters: Newsletter[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  ingest: () => Promise<IngestResult | null>;
  isIngesting: boolean;
  dailyDigest: string | null;
  isGeneratingDigest: boolean;
  generateDigest: () => Promise<void>;
  // Historical digests
  digestHistory: StoredDigest[];
  selectedDigestDate: string | null;
  selectDigestDate: (date: string | null) => void;
  // Read/save
  toggleRead: (id: string) => void;
  toggleSave: (id: string) => void;
}

function getDateKey(date?: Date): string {
  const d = date || new Date();
  return d.toISOString().slice(0, 10);
}

function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200); // ~200 words per minute
  return Math.max(1, minutes);
}

// Local storage keys
const DIGEST_HISTORY_KEY = "the-digest-history";
const READ_STATE_KEY = "the-digest-nl-read";
const SAVED_STATE_KEY = "the-digest-nl-saved";

function loadDigestHistory(): StoredDigest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DIGEST_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDigestToHistory(digest: StoredDigest) {
  if (typeof window === "undefined") return;
  const history = loadDigestHistory();
  // Replace if same date exists
  const idx = history.findIndex((d) => d.date === digest.date);
  if (idx >= 0) {
    history[idx] = digest;
  } else {
    history.unshift(digest);
  }
  // Keep last 30 days
  const trimmed = history.slice(0, 30);
  localStorage.setItem(DIGEST_HISTORY_KEY, JSON.stringify(trimmed));
}

function loadReadState(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(READ_STATE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadState(ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(READ_STATE_KEY, JSON.stringify([...ids]));
}

function loadSavedState(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SAVED_STATE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveSavedState(ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SAVED_STATE_KEY, JSON.stringify([...ids]));
}

/**
 * Hook for fetching newsletters.
 * Tries to fetch from API (Supabase), falls back to mock data.
 * Supports historical digests, reading time, read/save state.
 */
export function useNewsletters(): UseNewslettersReturn {
  const [newsletters, setNewsletters] = useState<Newsletter[]>(mockNewsletters);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [dailyDigest, setDailyDigest] = useState<string | null>(null);
  const [isGeneratingDigest, setIsGeneratingDigest] = useState(false);
  const [digestHistory, setDigestHistory] = useState<StoredDigest[]>([]);
  const [selectedDigestDate, setSelectedDigestDate] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Load persisted state on mount
  useEffect(() => {
    setDigestHistory(loadDigestHistory());
    setReadIds(loadReadState());
    setSavedIds(loadSavedState());
  }, []);

  // Apply reading time + read/save state to newsletters
  const enrichNewsletters = useCallback(
    (nls: Newsletter[]): Newsletter[] => {
      return nls.map((nl) => ({
        ...nl,
        readingTimeMinutes: estimateReadingTime(nl.content),
        isRead: readIds.has(nl.id),
        isSaved: savedIds.has(nl.id),
      }));
    },
    [readIds, savedIds]
  );

  // Re-enrich when read/save state changes
  useEffect(() => {
    setNewsletters((prev) => enrichNewsletters(prev));
  }, [readIds, savedIds, enrichNewsletters]);

  const toggleRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveReadState(next);
      return next;
    });
  }, []);

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveSavedState(next);
      return next;
    });
  }, []);

  const selectDigestDate = useCallback((date: string | null) => {
    setSelectedDigestDate(date);
    if (date) {
      const history = loadDigestHistory();
      const found = history.find((d) => d.date === date);
      setDailyDigest(found ? found.digest : null);
    } else {
      // Show today's digest if available
      const history = loadDigestHistory();
      const today = history.find((d) => d.date === getDateKey());
      setDailyDigest(today ? today.digest : null);
    }
  }, []);

  const fetchNewsletters = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/newsletters");
      const data = await res.json();

      if (data.newsletters && data.newsletters.length > 0) {
        const mapped: Newsletter[] = data.newsletters.map(
          (nl: {
            id: string;
            publication: string;
            subject: string;
            sender_email: string;
            received_at: string;
            content: string;
            is_read: boolean;
          }) => ({
            id: nl.id,
            publication: nl.publication,
            subject: nl.subject,
            receivedAt: nl.received_at,
            content: nl.content,
            isRead: nl.is_read,
            readingTimeMinutes: estimateReadingTime(nl.content),
          })
        );
        setNewsletters(enrichNewsletters(mapped));
      } else {
        setNewsletters(enrichNewsletters(mockNewsletters));
      }
    } catch {
      setNewsletters(enrichNewsletters(mockNewsletters));
    } finally {
      setIsLoading(false);
    }
  }, [enrichNewsletters]);

  const ingest = useCallback(async () => {
    setIsIngesting(true);
    setError(null);

    try {
      const res = await fetch("/api/ingest/newsletters");
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to ingest newsletters");
        return null;
      }

      // Try refreshing from the database first
      const listRes = await fetch("/api/newsletters");
      const listData = await listRes.json();

      if (listData.newsletters && listData.newsletters.length > 0) {
        const mapped: Newsletter[] = listData.newsletters.map(
          (nl: {
            id: string;
            publication: string;
            subject: string;
            sender_email: string;
            received_at: string;
            content: string;
            is_read: boolean;
          }) => ({
            id: nl.id,
            publication: nl.publication,
            subject: nl.subject,
            receivedAt: nl.received_at,
            content: nl.content,
            isRead: nl.is_read,
            readingTimeMinutes: estimateReadingTime(nl.content),
          })
        );
        setNewsletters(enrichNewsletters(mapped));
      } else if (data.newsletters && data.newsletters.length > 0) {
        // Use newsletters directly from the ingest response (includes summaries)
        const mapped: Newsletter[] = data.newsletters.map(
          (nl: {
            id: string;
            publication: string;
            subject: string;
            senderEmail: string;
            receivedAt: string;
            content: string;
            summary: {
              theNews: string;
              whyItMatters: string;
              theContext: string;
              soWhat: string;
              watchNext: string;
              recruiterRelevance: string;
            } | null;
          }) => ({
            id: nl.id,
            publication: nl.publication,
            subject: nl.subject,
            receivedAt: nl.receivedAt,
            content: nl.content,
            isRead: false,
            readingTimeMinutes: estimateReadingTime(nl.content),
            newsletterSummary: nl.summary
              ? {
                  theNews: nl.summary.theNews,
                  whyItMatters: nl.summary.whyItMatters,
                  theContext: nl.summary.theContext,
                  soWhat: nl.summary.soWhat || "",
                  watchNext: nl.summary.watchNext || "",
                  recruiterRelevance: nl.summary.recruiterRelevance || "",
                }
              : undefined,
            summary: nl.summary
              ? {
                  id: `summary-${nl.id}`,
                  articleId: nl.id,
                  brief: "",
                  theNews: nl.summary.theNews,
                  whyItMatters: nl.summary.whyItMatters,
                  theContext: nl.summary.theContext,
                  keyEntities: [],
                  generatedAt: new Date().toISOString(),
                }
              : undefined,
          })
        );
        setNewsletters(enrichNewsletters(mapped));
      }

      return {
        fetched: data.fetched as number,
        filtered: data.filtered as number,
        totalEmails: data.totalEmails as number,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to ingest newsletters";
      setError(message);
      return null;
    } finally {
      setIsIngesting(false);
    }
  }, [enrichNewsletters]);

  const generateDigest = useCallback(async () => {
    setIsGeneratingDigest(true);
    try {
      const res = await fetch("/api/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newsletters: newsletters.map((nl) => ({
            publication: nl.publication,
            subject: nl.subject,
            content: nl.content,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.digest) {
        setDailyDigest(data.digest);

        // Store in history
        const stored: StoredDigest = {
          date: getDateKey(),
          digest: data.digest,
          newsletterCount: newsletters.length,
          generatedAt: new Date().toISOString(),
        };
        saveDigestToHistory(stored);
        setDigestHistory(loadDigestHistory());
      } else {
        setError(data.error || "Failed to generate digest");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate digest";
      setError(message);
    } finally {
      setIsGeneratingDigest(false);
    }
  }, [newsletters]);

  // Load today's digest from history on mount
  useEffect(() => {
    const history = loadDigestHistory();
    const today = history.find((d) => d.date === getDateKey());
    if (today) {
      setDailyDigest(today.digest);
    }
  }, []);

  useEffect(() => {
    fetchNewsletters();
  }, [fetchNewsletters]);

  return {
    newsletters,
    isLoading,
    error,
    refresh: fetchNewsletters,
    ingest,
    isIngesting,
    dailyDigest,
    isGeneratingDigest,
    generateDigest,
    digestHistory,
    selectedDigestDate,
    selectDigestDate,
    toggleRead,
    toggleSave,
  };
}
