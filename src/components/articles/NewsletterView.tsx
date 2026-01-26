"use client";

import { useState } from "react";
import {
  Mail,
  ChevronDown,
  ChevronUp,
  Clock,
  RefreshCw,
  AlertCircle,
  Download,
} from "lucide-react";
import type { Newsletter } from "@/types";
import { getRelativeTime } from "@/lib/mock-data";
import { NewsletterCardSkeleton } from "@/components/ui/LoadingSkeleton";

interface NewsletterViewProps {
  newsletters: Newsletter[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onIngest: () => Promise<{ fetched: number; stored: number } | null>;
  isIngesting: boolean;
  isGmailConnected: boolean;
  onConnectGmail: () => void;
}

function publicationInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const publicationColors: Record<string, string> = {
  StrictlyVC: "#2563eb",
  Finimize: "#059669",
  "The Hustle": "#d97706",
  "Morning Brew": "#1e40af",
  "The Information": "#7c3aed",
  Axios: "#3b82f6",
  Bloomberg: "#0d0d0d",
  "Financial Times": "#c0392b",
  "CB Insights": "#059669",
  Politico: "#dc2626",
  Semafor: "#f59e0b",
};

function getPublicationColor(name: string): string {
  if (publicationColors[name]) return publicationColors[name];
  // Generate a deterministic color from the name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

function NewsletterCard({ newsletter }: { newsletter: Newsletter }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const color = getPublicationColor(newsletter.publication);

  return (
    <div
      className={`rounded-xl border bg-bg-card transition-all duration-200 ${
        isExpanded
          ? "border-accent-primary/30 shadow-md"
          : "border-border-primary hover:shadow-sm"
      }`}
    >
      <div
        className="flex cursor-pointer items-start gap-3 p-4 sm:p-5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {publicationInitials(newsletter.publication)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-text-primary">
              {newsletter.publication}
            </h3>
            <span className="flex shrink-0 items-center gap-1 text-xs text-text-tertiary">
              <Clock size={12} />
              {getRelativeTime(newsletter.receivedAt)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-text-secondary">
            {newsletter.subject}
          </p>
          {!newsletter.isRead && (
            <span className="mt-1 inline-block h-2 w-2 rounded-full bg-accent-primary" />
          )}
        </div>

        <button className="shrink-0 rounded-md p-1 text-text-tertiary transition-colors hover:text-text-primary">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-border-secondary px-4 py-4 sm:px-5">
          <div className="prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
            {newsletter.content}
          </div>
        </div>
      )}
    </div>
  );
}

export function NewsletterView({
  newsletters,
  isLoading,
  error,
  onRefresh,
  onIngest,
  isIngesting,
  isGmailConnected,
  onConnectGmail,
}: NewsletterViewProps) {
  const [ingestResult, setIngestResult] = useState<{
    fetched: number;
    stored: number;
  } | null>(null);

  const handleIngest = async () => {
    const result = await onIngest();
    if (result) {
      setIngestResult(result);
      setTimeout(() => setIngestResult(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail size={24} className="text-accent-primary" />
          <div>
            <h2 className="text-2xl font-bold text-text-primary">
              Newsletters
            </h2>
            <p className="text-sm text-text-tertiary">
              {newsletters.length} newsletter
              {newsletters.length !== 1 ? "s" : ""} today
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isGmailConnected && (
            <button
              onClick={handleIngest}
              disabled={isIngesting}
              className="flex items-center gap-1.5 rounded-lg border border-border-primary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover disabled:opacity-50"
            >
              <Download
                size={14}
                className={isIngesting ? "animate-bounce" : ""}
              />
              {isIngesting ? "Fetching..." : "Fetch New"}
            </button>
          )}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-border-primary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={isLoading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Gmail connection prompt */}
      {!isGmailConnected && (
        <div className="rounded-xl border border-accent-primary/30 bg-accent-secondary/30 p-4">
          <div className="flex items-start gap-3">
            <Mail size={20} className="mt-0.5 shrink-0 text-accent-primary" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-text-primary">
                Connect Gmail to see your newsletters
              </h3>
              <p className="mt-1 text-xs text-text-secondary">
                Connect a Gmail account dedicated to newsletters. The app will
                automatically fetch and parse your subscriptions.
              </p>
              <button
                onClick={onConnectGmail}
                className="mt-3 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-hover"
              >
                Connect Gmail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ingest result message */}
      {ingestResult && (
        <div className="rounded-lg border border-accent-success/30 bg-accent-success/10 px-4 py-3 text-sm text-accent-success">
          Fetched {ingestResult.fetched} emails, stored {ingestResult.stored}{" "}
          newsletters.
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-accent-danger/30 bg-accent-danger/10 px-4 py-3 text-sm text-accent-danger">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <NewsletterCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {newsletters.map((nl) => (
            <NewsletterCard key={nl.id} newsletter={nl} />
          ))}
        </div>
      )}
    </div>
  );
}
