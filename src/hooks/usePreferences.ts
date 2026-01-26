"use client";

import { useState, useEffect, useCallback } from "react";
import type { TopicCategory, InterestLevel } from "@/types";

type TopicPreferences = Record<TopicCategory, InterestLevel>;

const defaultPreferences: TopicPreferences = {
  "vc-startups": "high",
  "fundraising-acquisitions": "high",
  "executive-movements": "high",
  "financial-markets": "medium",
  geopolitics: "medium",
  automotive: "medium",
  "science-tech": "medium",
  "local-news": "low",
  politics: "medium",
};

interface UsePreferencesReturn {
  preferences: TopicPreferences;
  isLoading: boolean;
  setTopicLevel: (topic: TopicCategory, level: InterestLevel) => void;
  save: () => Promise<boolean>;
  isDirty: boolean;
}

export function usePreferences(): UsePreferencesReturn {
  const [preferences, setPreferences] =
    useState<TopicPreferences>(defaultPreferences);
  const [savedPreferences, setSavedPreferences] =
    useState<TopicPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/preferences");
        const data = await res.json();
        if (data.preferences) {
          setPreferences(data.preferences);
          setSavedPreferences(data.preferences);
        }
      } catch {
        // Use defaults
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const setTopicLevel = useCallback(
    (topic: TopicCategory, level: InterestLevel) => {
      setPreferences((prev) => ({ ...prev, [topic]: level }));
    },
    []
  );

  const save = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences }),
      });
      if (res.ok) {
        setSavedPreferences(preferences);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [preferences]);

  const isDirty = JSON.stringify(preferences) !== JSON.stringify(savedPreferences);

  return { preferences, isLoading, setTopicLevel, save, isDirty };
}
