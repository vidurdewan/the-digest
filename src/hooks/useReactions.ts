"use client";

import { useState, useCallback } from "react";
import type { ReactionType } from "@/types";

interface UseReactionsReturn {
  reactions: Record<string, ReactionType[]>;
  toggleReaction: (articleId: string, reaction: ReactionType) => void;
  getReactions: (articleId: string) => ReactionType[];
}

export function useReactions(): UseReactionsReturn {
  const [reactions, setReactions] = useState<Record<string, ReactionType[]>>({});

  const toggleReaction = useCallback(
    (articleId: string, reaction: ReactionType) => {
      setReactions((prev) => {
        const existing = prev[articleId] || [];
        const hasReaction = existing.includes(reaction);
        const updated = hasReaction
          ? existing.filter((r) => r !== reaction)
          : [...existing, reaction];

        return { ...prev, [articleId]: updated };
      });

      // Fire-and-forget API call
      fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, reaction }),
      }).catch(() => {
        // Silent failure — non-critical
      });
    },
    []
  );

  const getReactions = useCallback(
    (articleId: string): ReactionType[] => {
      return reactions[articleId] || [];
    },
    [reactions]
  );

  return { reactions, toggleReaction, getReactions };
}
