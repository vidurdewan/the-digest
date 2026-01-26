"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const POLL_INTERVAL_MS = 60_000; // 60 seconds

interface UseAutoRefreshReturn {
  /** Number of new articles since last refresh */
  newCount: number;
  /** Timestamp of the last successful full fetch */
  lastUpdated: Date | null;
  /** Whether a poll check is in progress */
  isChecking: boolean;
  /** Call to acknowledge new articles and refresh the feed */
  showNew: () => void;
  /** Register the refresh callback (called by parent to wire up article refresh) */
  setRefreshFn: (fn: () => Promise<void>) => void;
}

export function useAutoRefresh(): UseAutoRefreshReturn {
  const [newCount, setNewCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const knownCount = useRef(0);
  const knownLatest = useRef<string | null>(null);
  const refreshFnRef = useRef<(() => Promise<void>) | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setRefreshFn = useCallback((fn: () => Promise<void>) => {
    refreshFnRef.current = fn;
  }, []);

  // Poll for new content
  const checkForNew = useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await fetch("/api/articles?countOnly=true");
      const data = await res.json();

      if (data.count != null && data.latestPublishedAt != null) {
        // On first poll, just record the baseline
        if (knownCount.current === 0 && knownLatest.current === null) {
          knownCount.current = data.count;
          knownLatest.current = data.latestPublishedAt;
          setLastUpdated(new Date());
          return;
        }

        // Detect new content
        if (
          data.latestPublishedAt !== knownLatest.current ||
          data.count > knownCount.current
        ) {
          const diff = Math.max(0, data.count - knownCount.current);
          setNewCount(diff > 0 ? diff : 1); // At least 1 if timestamp changed
        }
      }
    } catch {
      // Silent fail on poll — don't disrupt the user
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Show new articles: refresh feed + reset counter
  const showNew = useCallback(async () => {
    if (refreshFnRef.current) {
      await refreshFnRef.current();
    }

    // Re-check to update baseline
    try {
      const res = await fetch("/api/articles?countOnly=true");
      const data = await res.json();
      if (data.count != null) {
        knownCount.current = data.count;
        knownLatest.current = data.latestPublishedAt;
      }
    } catch {
      // ignore
    }

    setNewCount(0);
    setLastUpdated(new Date());
  }, []);

  // Start polling on mount
  useEffect(() => {
    // Initial baseline check
    checkForNew();

    intervalRef.current = setInterval(checkForNew, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkForNew]);

  return {
    newCount,
    lastUpdated,
    isChecking,
    showNew,
    setRefreshFn,
  };
}
