"use client";

import { BookOpen, CheckCircle } from "lucide-react";

interface ReadingProgressProps {
  totalItems: number;
  readItems: number;
}

export function ReadingProgress({ totalItems, readItems }: ReadingProgressProps) {
  const percent = totalItems > 0 ? Math.round((readItems / totalItems) * 100) : 0;
  const allRead = readItems >= totalItems && totalItems > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
          {allRead ? (
            <CheckCircle size={12} className="text-accent-success" />
          ) : (
            <BookOpen size={12} />
          )}
          {allRead
            ? "All caught up"
            : `${readItems} of ${totalItems} read`}
        </span>
        <span className="text-xs font-semibold text-text-secondary">
          {percent}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-bg-tertiary overflow-hidden">
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
  );
}
