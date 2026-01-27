"use client";

import { RefreshCw, Loader2, BookOpen } from "lucide-react";
import { useTodaysBrief } from "@/hooks/useTodaysBrief";

export function TodaysBrief() {
  const { brief, isLoading, error, refresh } = useTodaysBrief();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Don't render anything if there's an error and no brief
  if (error && !brief && !isLoading) return null;

  return (
    <section className="rounded-xl border border-border-primary bg-bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-secondary px-5 py-3">
        <div className="flex items-center gap-2.5">
          <BookOpen size={18} className="text-accent-primary" />
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              Today&apos;s Brief
            </h3>
            <p className="text-xs text-text-tertiary">{today}</p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="rounded-lg p-1.5 text-text-tertiary hover:text-text-secondary hover:bg-bg-secondary transition-colors disabled:opacity-50"
          title="Regenerate brief"
        >
          {isLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {isLoading && !brief && (
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-bg-secondary" />
            <div className="h-4 w-11/12 animate-pulse rounded bg-bg-secondary" />
            <div className="h-4 w-full animate-pulse rounded bg-bg-secondary" />
            <div className="h-4 w-9/12 animate-pulse rounded bg-bg-secondary" />
            <div className="mt-4 h-4 w-full animate-pulse rounded bg-bg-secondary" />
            <div className="h-4 w-10/12 animate-pulse rounded bg-bg-secondary" />
          </div>
        )}

        {brief && (
          <div className="prose prose-sm max-w-none text-text-secondary leading-relaxed">
            {brief.split("\n\n").map((paragraph, i) => (
              <p key={i} className={i > 0 ? "mt-3" : ""}>
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
