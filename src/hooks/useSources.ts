"use client";

import { useState, useEffect, useCallback } from "react";
import type { TopicCategory } from "@/types";

export interface Source {
  id: string;
  name: string;
  url: string;
  type: "rss" | "api";
  topic: TopicCategory;
  is_active?: boolean;
  isActive?: boolean;
}

interface UseSourcesReturn {
  sources: Source[];
  isLoading: boolean;
  addSource: (source: {
    name: string;
    url: string;
    type: "rss" | "api";
    topic: TopicCategory;
  }) => Promise<boolean>;
  removeSource: (id: string) => Promise<boolean>;
}

export function useSources(): UseSourcesReturn {
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch("/api/sources");
      const data = await res.json();
      setSources(data.sources || []);
    } catch {
      setSources([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const addSource = useCallback(async (source: {
    name: string;
    url: string;
    type: "rss" | "api";
    topic: TopicCategory;
  }) => {
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(source),
      });
      if (res.ok) {
        await fetchSources();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [fetchSources]);

  const removeSource = useCallback(async (id: string) => {
    try {
      const res = await fetch("/api/sources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setSources((prev) => prev.filter((s) => s.id !== id));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return { sources, isLoading, addSource, removeSource };
}
