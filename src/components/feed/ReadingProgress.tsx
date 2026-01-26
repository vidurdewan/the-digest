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
    <div className="flex items-center gap-3 rounded-lg border border-border-primary bg-bg-card px-4 py-2.5 transition-theme">
      <CheckCircle2
        size={18}
        className={allRead ? "text-accent-success" : "text-text-tertiary"}
      />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-text-secondary">
            {allRead
              ? "All priority items covered"
              : `You've covered ${readItems} of ${totalItems} priority items today`}
          </span>
          <span className="text-xs font-bold text-text-primary">{percent}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-secondary">
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
    </div>
  );
}
