"use client";

import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
  Clock3,
  ArrowUpRight,
} from "lucide-react";
import type { ContinuityDepth, SinceLastReadPayload } from "@/types";

interface SinceLastReadCardProps {
  payload: SinceLastReadPayload | null;
  depth: ContinuityDepth;
  isLoading: boolean;
  isAcknowledging: boolean;
  error: string | null;
  onDepthChange: (depth: ContinuityDepth) => void;
  onRefresh: () => Promise<void>;
  onMarkCaughtUp: () => Promise<boolean>;
  onOpenArticle: (articleId: string) => void;
}

const DEPTH_OPTIONS: Array<{ value: ContinuityDepth; label: string }> = [
  { value: "2m", label: "2 min" },
  { value: "10m", label: "10 min" },
  { value: "deep", label: "Deep dive" },
];

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "First visit";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPublishedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SinceLastReadCard({
  payload,
  depth,
  isLoading,
  isAcknowledging,
  error,
  onDepthChange,
  onRefresh,
  onMarkCaughtUp,
  onOpenArticle,
}: SinceLastReadCardProps) {
  if (isLoading && !payload) {
    return (
      <section className="mb-8 rounded-2xl border border-border-primary bg-bg-card p-6 shadow-sm">
        <div className="mb-4 h-4 w-40 animate-pulse rounded bg-bg-secondary" />
        <div className="mb-2 h-3 w-full animate-pulse rounded bg-bg-secondary" />
        <div className="mb-2 h-3 w-11/12 animate-pulse rounded bg-bg-secondary" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-bg-secondary" />
      </section>
    );
  }

  if (!payload && error) {
    return (
      <section className="mb-8 rounded-2xl border border-accent-danger/30 bg-bg-card p-6 shadow-sm">
        <p className="text-sm text-text-primary">{error}</p>
        <button
          onClick={() => {
            void onRefresh();
          }}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border-primary px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
        >
          <RefreshCw size={13} /> Retry
        </button>
      </section>
    );
  }

  if (!payload) return null;

  const hasUpdates = payload.counts.newArticles > 0;
  const lastSeenLabel = formatRelativeDate(payload.state.lastSeenAt);

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-border-primary bg-bg-card shadow-sm">
      <div className="border-b border-border-primary bg-gradient-to-r from-[var(--accent-secondary)] to-transparent px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
              <Sparkles size={13} className="text-accent-primary" />
              Since You Last Read
            </p>
            <h2 className="mt-1 text-lg font-semibold text-text-primary">
              {payload.brief.headline}
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-text-tertiary">
              <Clock3 size={12} />
              Last seen {lastSeenLabel}
              {payload.state.cached && <span>· cached</span>}
            </p>
          </div>

          <button
            onClick={() => {
              void onRefresh();
            }}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-primary px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary disabled:opacity-50"
            title="Refresh continuity snapshot"
          >
            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Refresh
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {DEPTH_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onDepthChange(option.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                depth === option.value
                  ? "bg-accent-primary text-text-inverse"
                  : "bg-bg-secondary text-text-secondary hover:text-text-primary"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-bg-secondary px-2.5 py-1 text-text-secondary">
            {payload.counts.newArticles} new stories
          </span>
          <span className="rounded-full bg-bg-secondary px-2.5 py-1 text-text-secondary">
            {payload.counts.newThreads} developing threads
          </span>
          <span className="rounded-full bg-bg-secondary px-2.5 py-1 text-text-secondary">
            {payload.counts.watchlistHits} watchlist hits
          </span>
        </div>

        <p className="text-sm leading-relaxed text-text-secondary">{payload.brief.summary}</p>

        {!hasUpdates && (
          <div className="mt-4 rounded-xl border border-accent-success/30 bg-accent-success/10 px-4 py-3 text-sm text-text-primary">
            You are caught up. No major deltas were detected.
          </div>
        )}

        {payload.brief.changed.length > 0 && (
          <div className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
              What Changed
            </h3>
            <ul className="mt-2 space-y-1.5">
              {payload.brief.changed.map((line, index) => (
                <li key={`${line}-${index}`} className="text-sm text-text-primary">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        {payload.brief.unchanged.length > 0 && (
          <div className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
              Still Open
            </h3>
            <ul className="mt-2 space-y-1.5">
              {payload.brief.unchanged.map((line, index) => (
                <li key={`${line}-${index}`} className="text-sm text-text-secondary">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        {payload.brief.watchNext.length > 0 && (
          <div className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
              Watch Next
            </h3>
            <ul className="mt-2 space-y-1.5">
              {payload.brief.watchNext.map((line, index) => (
                <li key={`${line}-${index}`} className="text-sm text-text-secondary">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        {payload.highlights.length > 0 && (
          <div className="mt-6 border-t border-border-primary pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
              Top Deltas
            </h3>
            <div className="mt-3 space-y-2">
              {payload.highlights.map((item) => (
                <button
                  key={item.articleId}
                  onClick={() => onOpenArticle(item.articleId)}
                  className="w-full rounded-lg border border-border-secondary px-3 py-3 text-left hover:border-border-primary hover:bg-bg-hover"
                >
                  <p className="text-sm font-medium text-text-primary">{item.title}</p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    {item.source} · {formatPublishedAt(item.publishedAt)}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">{item.reason}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {payload.citations.length > 0 && (
          <div className="mt-6 border-t border-border-primary pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
              Sources
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {payload.citations.map((citation, index) => (
                citation.sourceUrl ? (
                  <a
                    key={citation.articleId}
                    href={citation.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-border-primary px-2 py-1 text-xs text-text-secondary hover:text-text-primary"
                  >
                    [A{index + 1}] {citation.source}
                    <ArrowUpRight size={11} />
                  </a>
                ) : (
                  <span
                    key={citation.articleId}
                    className="inline-flex items-center gap-1 rounded-md border border-border-primary px-2 py-1 text-xs text-text-tertiary"
                  >
                    [A{index + 1}] {citation.source}
                  </span>
                )
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end border-t border-border-primary pt-5">
          <button
            onClick={() => {
              void onMarkCaughtUp();
            }}
            disabled={isAcknowledging}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-accent-primary-hover disabled:opacity-60"
          >
            {isAcknowledging ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            Mark as caught up
          </button>
        </div>
      </div>
    </section>
  );
}
