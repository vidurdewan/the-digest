"use client";

interface ReadingProgressProps {
  totalItems: number;
  readItems: number;
}

export function ReadingProgress({ totalItems, readItems }: ReadingProgressProps) {
  const percent = totalItems > 0 ? Math.round((readItems / totalItems) * 100) : 0;
  const allRead = readItems >= totalItems && totalItems > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-tertiary">
          {allRead
            ? "All caught up"
            : `${readItems} of ${totalItems} read`}
        </span>
        <span className="text-xs font-medium text-text-tertiary">
          {percent}%
        </span>
      </div>
      <div className="h-[3px] w-full rounded-full bg-bg-tertiary overflow-hidden">
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
