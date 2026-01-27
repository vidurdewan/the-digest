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

const defaultVipNewsletters: string[] = ["Stratechery"];

interface UsePreferencesReturn {
  preferences: TopicPreferences;
  isLoading: boolean;
  setTopicLevel: (topic: TopicCategory, level: InterestLevel) => void;
  save: () => Promise<boolean>;
  isDirty: boolean;
  // VIP newsletters
  vipNewsletters: string[];
  setVipNewsletters: (publications: string[]) => void;
  addVipNewsletter: (publication: string) => void;
  removeVipNewsletter: (publication: string) => void;
}

export function usePreferences(): UsePreferencesReturn {
  const [preferences, setPreferences] =
    useState<TopicPreferences>(defaultPreferences);
  const [savedPreferences, setSavedPreferences] =
    useState<TopicPreferences>(defaultPreferences);
  const [vipNewsletters, setVipNewslettersState] =
    useState<string[]>(defaultVipNewsletters);
  const [savedVipNewsletters, setSavedVipNewsletters] =
    useState<string[]>(defaultVipNewsletters);
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
        if (data.vipNewsletters && Array.isArray(data.vipNewsletters)) {
          setVipNewslettersState(data.vipNewsletters);
          setSavedVipNewsletters(data.vipNewsletters);
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

  const setVipNewsletters = useCallback((publications: string[]) => {
    setVipNewslettersState(publications);
  }, []);

  const addVipNewsletter = useCallback((publication: string) => {
    setVipNewslettersState((prev) => {
      if (prev.includes(publication)) return prev;
      return [...prev, publication];
    });
  }, []);

  const removeVipNewsletter = useCallback((publication: string) => {
    setVipNewslettersState((prev) => prev.filter((p) => p !== publication));
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences, vipNewsletters }),
      });
      if (res.ok) {
        setSavedPreferences(preferences);
        setSavedVipNewsletters(vipNewsletters);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [preferences, vipNewsletters]);

  const isDirty =
    JSON.stringify(preferences) !== JSON.stringify(savedPreferences) ||
    JSON.stringify(vipNewsletters) !== JSON.stringify(savedVipNewsletters);

  return {
    preferences,
    isLoading,
    setTopicLevel,
    save,
    isDirty,
    vipNewsletters,
    setVipNewsletters,
    addVipNewsletter,
    removeVipNewsletter,
  };
}
