"use client";

import { CheckCircle2 } from "lucide-react";

interface ReadingProgressProps {
  totalItems: number;
  readItems: number;
}

export function ReadingProgress({ totalItems, readItems }: ReadingProgressProps) {
  const percent = totalItems > 0 ? Math.round((readItems / totalItems) * 100) : 0;
  const allRead = readItems >= totalItems && totalItems > 0;

  return (
    <div className="flex items-center gap-3">
      <CheckCircle2
        size={14}
        className={allRead ? "text-accent-success" : "text-text-tertiary"}
      />
      <div className="flex-1">
        <div className="h-1 w-full overflow-hidden rounded-full bg-bg-tertiary">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percent}%`,
              backgroundColor: allRead
                ? "var(--accent-success)"
                : "var(--accent-primary)",
            }}
          />
        </div>
      </div>
      <span className="text-[11px] text-text-tertiary">
        {allRead ? "All caught up" : `${readItems}/${totalItems}`}
      </span>
    </div>
  );
}
