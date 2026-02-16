"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, Loader2, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
import type { MorningBriefing } from "@/types";

const LAST_SEEN_KEY = "the-digest-last-briefing-seen";

function getDefaultSince(): string {
  return new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString();
}

export function MorningBriefingView() {
  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const since = useMemo(() => {
    if (typeof window === "undefined") return getDefaultSince();
    return localStorage.getItem(LAST_SEEN_KEY) || getDefaultSince();
  }, []);

  const fetchBriefing = useCallback(async (force = false) => {
    setError(null);
    if (force) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const res = await fetch(
        force
          ? "/api/intelligence/morning-briefing"
          : `/api/intelligence/morning-briefing?since=${encodeURIComponent(
              since
            )}`,
        force
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ since }),
            }
          : undefined
      );

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to load morning briefing");
      }

      setBriefing(data.briefing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load morning briefing");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [since]);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  const markAsSeen = () => {
    const timestamp = new Date().toISOString();
    localStorage.setItem(LAST_SEEN_KEY, timestamp);
    setBriefing((current) =>
      current
        ? {
            ...current,
            since: timestamp,
          }
        : current
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-14">
        <Loader2 size={22} className="animate-spin text-accent-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-accent-danger/30 bg-accent-danger/10 p-5">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-accent-danger">
          <TriangleAlert size={16} />
          Could not load morning briefing
        </p>
        <p className="text-sm text-accent-danger/90">{error}</p>
        <button
          onClick={() => fetchBriefing(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent-danger px-3 py-1.5 text-xs font-medium text-white"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-bold text-text-primary">
            <Sparkles size={18} className="text-accent-primary" />
            Morning Briefing Copilot
          </h3>
          <p className="text-sm text-text-tertiary">
            What changed since your last check-in.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchBriefing(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-primary bg-bg-card px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-secondary disabled:opacity-60"
          >
            {isRefreshing ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            Refresh
          </button>
          <button
            onClick={markAsSeen}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-medium text-text-inverse hover:bg-accent-primary-hover"
          >
            <BellRing size={13} />
            Mark seen
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border-primary bg-bg-card p-5">
        <p className="text-xs text-text-tertiary">
          Since {new Date(briefing?.since || since).toLocaleString()}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {briefing?.summary || "No updates available yet."}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border-primary bg-bg-card p-4">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-primary">
            What Changed
          </h4>
          <ul className="space-y-2">
            {(briefing?.whatChanged || []).map((item, index) => (
              <li key={index} className="text-sm text-text-secondary">
                • {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border-primary bg-bg-card p-4">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-primary">
            Suggested Next Moves
          </h4>
          <ul className="space-y-2">
            {(briefing?.actionItems || []).map((item, index) => (
              <li key={index} className="text-sm text-text-secondary">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {(briefing?.threads || []).length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
            Live Story Threads
          </h4>
          {(briefing?.threads || []).map((thread, index) => (
            <div
              key={`${thread.title}-${index}`}
              className="rounded-xl border border-border-primary bg-bg-card p-4"
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-text-primary">{thread.title}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                    thread.urgency === "high"
                      ? "bg-accent-danger/10 text-accent-danger"
                      : thread.urgency === "medium"
                        ? "bg-accent-warning/15 text-accent-warning"
                        : "bg-bg-secondary text-text-tertiary"
                  }`}
                >
                  {thread.urgency}
                </span>
              </div>
              <p className="text-sm text-text-secondary">{thread.summary}</p>
              <p className="mt-1 text-xs text-text-tertiary">
                {thread.articleCount} linked update{thread.articleCount === 1 ? "" : "s"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
