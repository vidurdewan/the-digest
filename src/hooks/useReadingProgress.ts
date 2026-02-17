"use client";

import { useEffect, useRef, useCallback } from "react";

interface ReadingProgressData {
  totalPriorityItems: number;
  itemsRead: number;
}

/**
 * Persists reading progress to the server.
 * Fire-and-forget — does not block the UI.
 */
export function useReadingProgress(data: ReadingProgressData) {
  const lastSaved = useRef<string>("");

  const save = useCallback(async (progress: ReadingProgressData) => {
    const key = `${progress.totalPriorityItems}-${progress.itemsRead}`;
    if (key === lastSaved.current) return;
    lastSaved.current = key;

    try {
      await fetch("/api/reading-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(progress),
      });
    } catch {
      // Fire-and-forget
    }
  }, []);

  // Persist whenever data changes (debounced via ref check)
  useEffect(() => {
    if (data.totalPriorityItems === 0) return;
    save(data);
  }, [data, save]);
}
