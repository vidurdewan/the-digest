"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getOrCreateClientId } from "@/lib/client-id";
import type { ContinuityDepth, SinceLastReadPayload } from "@/types";

interface UseSinceLastReadReturn {
  payload: SinceLastReadPayload | null;
  depth: ContinuityDepth;
  isLoading: boolean;
  isAcknowledging: boolean;
  error: string | null;
  setDepth: (depth: ContinuityDepth) => void;
  refresh: () => Promise<void>;
  markCaughtUp: () => Promise<boolean>;
}

function normalizeDepth(depth: string | null | undefined): ContinuityDepth {
  if (depth === "2m" || depth === "10m" || depth === "deep") return depth;
  return "2m";
}

export function useSinceLastRead(): UseSinceLastReadReturn {
  const [payload, setPayload] = useState<SinceLastReadPayload | null>(null);
  const [depth, setDepthState] = useState<ContinuityDepth>("2m");
  const [isLoading, setIsLoading] = useState(true);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientIdRef = useRef<string>("anonymous");
  const requestIdRef = useRef(0);

  const fetchSnapshot = useCallback(
    async (requestedDepth: ContinuityDepth) => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const clientId = clientIdRef.current;
        const response = await fetch(
          `/api/since-last-read?depth=${encodeURIComponent(requestedDepth)}`,
          {
            headers: {
              "x-digest-client-id": clientId,
            },
          }
        );

        const data = await response.json();
        if (!response.ok) {
          if (requestId !== requestIdRef.current) return;
          setError(data.error || "Failed to load continuity snapshot");
          return;
        }

        if (requestId !== requestIdRef.current) return;
        setPayload(data as SinceLastReadPayload);
        setDepthState(normalizeDepth((data as SinceLastReadPayload).state.depth));
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(
          err instanceof Error ? err.message : "Failed to load continuity snapshot"
        );
      } finally {
        if (requestId !== requestIdRef.current) return;
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    clientIdRef.current = getOrCreateClientId();
    void fetchSnapshot(depth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDepth = useCallback(
    (nextDepth: ContinuityDepth) => {
      setDepthState(nextDepth);
      void fetchSnapshot(nextDepth);
    },
    [fetchSnapshot]
  );

  const refresh = useCallback(async () => {
    await fetchSnapshot(depth);
  }, [depth, fetchSnapshot]);

  const markCaughtUp = useCallback(async (): Promise<boolean> => {
    setIsAcknowledging(true);
    setError(null);

    try {
      const response = await fetch("/api/since-last-read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-digest-client-id": clientIdRef.current,
        },
        body: JSON.stringify({
          depth,
          untilAt: payload?.state.untilAt,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to mark as caught up");
        return false;
      }

      await fetchSnapshot(depth);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as caught up");
      return false;
    } finally {
      setIsAcknowledging(false);
    }
  }, [depth, fetchSnapshot, payload?.state.untilAt]);

  return {
    payload,
    depth,
    isLoading,
    isAcknowledging,
    error,
    setDepth,
    refresh,
    markCaughtUp,
  };
}
