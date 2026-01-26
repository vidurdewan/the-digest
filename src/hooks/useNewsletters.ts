"use client";

import { useState, useEffect, useCallback } from "react";
import type { Newsletter } from "@/types";
import { mockNewsletters } from "@/lib/mock-data";

interface UseNewslettersReturn {
  newsletters: Newsletter[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  ingest: () => Promise<{ fetched: number; stored: number } | null>;
  isIngesting: boolean;
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

  const fetchNewsletters = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/newsletters");
      const data = await res.json();

      if (data.newsletters && data.newsletters.length > 0) {
        // Map Supabase row format to our Newsletter type
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
        // Fallback to mock data
        setNewsletters(mockNewsletters);
      }
    } catch {
      // API not available, use mock data
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
        // Use newsletters directly from the ingest response
        const mapped: Newsletter[] = data.newsletters.map(
          (nl: {
            id: string;
            publication: string;
            subject: string;
            senderEmail: string;
            receivedAt: string;
            contentPreview: string;
          }) => ({
            id: nl.id,
            publication: nl.publication,
            subject: nl.subject,
            receivedAt: nl.receivedAt,
            content: nl.contentPreview,
            isRead: false,
          })
        );
        setNewsletters(mapped);
      }

      return {
        fetched: data.fetched as number,
        stored: data.stored as number,
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
  };
}
