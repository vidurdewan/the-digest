"use client";

import { useCallback, useEffect, useState } from "react";

type EventType = "click" | "read" | "save" | "share" | "expand";

interface UseEngagementReturn {
  trackEvent: (articleId: string, eventType: EventType, durationSeconds?: number) => void;
  topicScores: Record<string, number>;
  isLoading: boolean;
}

/**
 * Hook for tracking user engagement with articles.
 * Sends events to the API and loads topic preference scores.
 */
export function useEngagement(): UseEngagementReturn {
  const [topicScores, setTopicScores] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch topic engagement scores on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/engagement?type=topic-scores");
        const data = await res.json();
        setTopicScores(data.scores || {});
      } catch {
        setTopicScores({});
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  /**
   * Fire-and-forget engagement event tracking.
   * Doesn't block the UI.
   */
  const trackEvent = useCallback(
    (articleId: string, eventType: EventType, durationSeconds?: number) => {
      // Fire and forget — don't await
      fetch("/api/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, eventType, durationSeconds }),
      }).catch(() => {
        // Silently fail — engagement tracking is non-critical
      });
    },
    []
  );

  return { trackEvent, topicScores, isLoading };
}
