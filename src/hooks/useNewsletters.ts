"use client";

import { useState, useEffect, useCallback } from "react";
import type { Newsletter } from "@/types";
import { mockNewsletters } from "@/lib/mock-data";

interface IngestResult {
  fetched: number;
  filtered: number;
  totalEmails: number;
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
}

/**
 * Hook for fetching newsletters.
 * Tries to fetch from API (Supabase), falls back to mock data.
 */
export function useNewsletters(): UseNewslettersReturn {
  const [newsletters, setNewsletters] = useState<Newsletter[]>(mockNewsletters);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [dailyDigest, setDailyDigest] = useState<string | null>(null);
  const [isGeneratingDigest, setIsGeneratingDigest] = useState(false);

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
          })
        );
        setNewsletters(mapped);
      } else {
        setNewsletters(mockNewsletters);
      }
    } catch {
      setNewsletters(mockNewsletters);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
          })
        );
        setNewsletters(mapped);
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
            } | null;
          }) => ({
            id: nl.id,
            publication: nl.publication,
            subject: nl.subject,
            receivedAt: nl.receivedAt,
            content: nl.content,
            isRead: false,
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
        setNewsletters(mapped);
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
  }, []);

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
  };
}
