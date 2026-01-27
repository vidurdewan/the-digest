"use client";

import { CheckCircle2 } from "lucide-react";

interface ReadingProgressProps {
  totalItems: number;
  readItems: number;
}

function scrollToFirstUnread() {
  // Find the first unread indicator dot on the page and scroll to its parent card
  const unreadDots = document.querySelectorAll("[data-feed-index]");
  for (const card of unreadDots) {
    // Check if this card has an unread dot child
    const dot = card.querySelector(".bg-accent-primary");
    if (dot && dot.classList.contains("rounded-full")) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
  }
  // Fallback: scroll to the Top Stories section
  const topStories = document.querySelector("h3");
  if (topStories) {
    topStories.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function ReadingProgress({ totalItems, readItems }: ReadingProgressProps) {
  const percent = totalItems > 0 ? Math.round((readItems / totalItems) * 100) : 0;
  const allRead = readItems >= totalItems && totalItems > 0;

  return (
    <div
      className={`flex items-center gap-3 ${!allRead ? "cursor-pointer group" : ""}`}
      onClick={!allRead ? scrollToFirstUnread : undefined}
      title={!allRead ? "Jump to next unread" : undefined}
    >
      {/* Ring indicator */}
      <div className="relative h-8 w-8 shrink-0">
        <svg className={`h-8 w-8 -rotate-90 ${!allRead ? "group-hover:scale-110 transition-transform" : ""}`} viewBox="0 0 32 32">
          {/* Background ring */}
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="none"
            stroke="var(--bg-tertiary)"
            strokeWidth="3"
          />
          {/* Progress ring */}
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="none"
            stroke={allRead ? "var(--accent-success)" : "var(--accent-primary)"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 13}`}
            strokeDashoffset={`${2 * Math.PI * 13 * (1 - percent / 100)}`}
            className="transition-all duration-500"
          />
        </svg>
        {allRead && (
          <CheckCircle2
            size={14}
            className="absolute inset-0 m-auto text-accent-success"
          />
        )}
      </div>

      {/* Label */}
      <div className="flex flex-col">
        <span className={`text-xs font-medium text-text-primary ${!allRead ? "group-hover:text-accent-primary transition-colors" : ""}`}>
          {allRead ? "All caught up" : `${readItems} of ${totalItems} read`}
        </span>
        <span className="text-[10px] text-text-tertiary">
          {allRead ? "Great work today" : "Today\u2019s progress"}
        </span>
      </div>

      {/* Percentage */}
      {!allRead && (
        <span className="ml-auto text-xs font-semibold text-text-tertiary group-hover:text-accent-primary transition-colors">
          {percent}%
        </span>
      )}
    </div>
  );
}
