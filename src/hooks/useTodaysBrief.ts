"use client";

import { useState, useEffect, useCallback } from "react";

interface UseTodaysBriefReturn {
  brief: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useTodaysBrief(): UseTodaysBriefReturn {
  const [brief, setBrief] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBrief = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/todays-brief");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to fetch brief");
        return;
      }
      setBrief(data.brief);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch brief");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrief();
  }, [fetchBrief]);

  return { brief, isLoading, error, refresh: fetchBrief };
}
