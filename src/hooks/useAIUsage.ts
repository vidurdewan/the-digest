"use client";

import { useState, useEffect, useCallback } from "react";

interface AIUsage {
  date: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  callCount: number;
  budgetCents: number;
  budgetUsedPercent: number;
  isOverBudget: boolean;
}

interface UseAIUsageReturn {
  configured: boolean;
  usage: AIUsage | null;
  isLoading: boolean;
  refresh: () => void;
}

export function useAIUsage(): UseAIUsageReturn {
  const [configured, setConfigured] = useState(false);
  const [usage, setUsage] = useState<AIUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/summarize?status=true");
      const data = await res.json();
      setConfigured(data.configured || false);
      setUsage(data.usage || null);
    } catch {
      setConfigured(false);
      setUsage(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { configured, usage, isLoading, refresh: fetchStatus };
}
