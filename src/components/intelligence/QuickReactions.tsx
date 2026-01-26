"use client";

import { useState } from "react";
import { Check, Lightbulb, Sparkles, ThumbsDown, Unlink } from "lucide-react";
import type { ReactionType } from "@/types";

interface QuickReactionsProps {
  articleId: string;
  initialReactions?: ReactionType[];
  onReact?: (articleId: string, reaction: ReactionType) => void;
  showFeedback?: boolean;
}

const REACTION_CONFIG: {
  type: ReactionType;
  label: string;
  icon: typeof Check;
  activeColor: string;
}[] = [
  { type: "already_knew", label: "Already knew", icon: Check, activeColor: "bg-gray-200 text-gray-700 border-gray-400" },
  { type: "useful", label: "Useful", icon: Lightbulb, activeColor: "bg-blue-100 text-blue-700 border-blue-400" },
  { type: "surprising", label: "Surprising", icon: Sparkles, activeColor: "bg-amber-100 text-amber-700 border-amber-400" },
];

const FEEDBACK_CONFIG: {
  type: ReactionType;
  label: string;
  icon: typeof Check;
  activeColor: string;
}[] = [
  { type: "bad_connection", label: "Bad connection", icon: Unlink, activeColor: "bg-red-100 text-red-700 border-red-400" },
  { type: "not_important", label: "Not important", icon: ThumbsDown, activeColor: "bg-red-100 text-red-600 border-red-400" },
];

export function QuickReactions({
  articleId,
  initialReactions = [],
  onReact,
  showFeedback = true,
}: QuickReactionsProps) {
  const [activeReactions, setActiveReactions] = useState<Set<ReactionType>>(
    new Set(initialReactions)
  );

  const handleReaction = (reaction: ReactionType) => {
    setActiveReactions((prev) => {
      const next = new Set(prev);
      if (next.has(reaction)) {
        next.delete(reaction);
      } else {
        next.add(reaction);
      }
      return next;
    });
    onReact?.(articleId, reaction);
  };

  const allButtons = showFeedback
    ? [...REACTION_CONFIG, ...FEEDBACK_CONFIG]
    : REACTION_CONFIG;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {allButtons.map(({ type, label, icon: Icon, activeColor }) => {
        const isActive = activeReactions.has(type);
        return (
          <button
            key={type}
            onClick={(e) => {
              e.stopPropagation();
              handleReaction(type);
            }}
            className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-all ${
              isActive
                ? activeColor
                : "border-border-primary text-text-tertiary hover:border-border-secondary hover:text-text-secondary"
            }`}
          >
            <Icon size={11} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
