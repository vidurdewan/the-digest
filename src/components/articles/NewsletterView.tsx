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
  Sparkles,
  Loader2,
  Newspaper,
  Lightbulb,
  Globe,
} from "lucide-react";
import type { Newsletter } from "@/types";
import { getRelativeTime } from "@/lib/mock-data";
import { NewsletterCardSkeleton } from "@/components/ui/LoadingSkeleton";

interface NewsletterViewProps {
  newsletters: Newsletter[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onIngest: () => Promise<{ fetched: number; filtered: number; totalEmails: number } | null>;
  isIngesting: boolean;
  isGmailConnected: boolean;
  onConnectGmail: () => void;
  dailyDigest: string | null;
  isGeneratingDigest: boolean;
  onGenerateDigest: () => Promise<void>;
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
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

// ─── Daily Digest Section ────────────────────────────────────
function DailyDigestSection({
  digest,
  isGenerating,
  onGenerate,
  newsletterCount,
}: {
  digest: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
  newsletterCount: number;
}) {
  if (!digest && !isGenerating) {
    return (
      <div className="rounded-xl border border-accent-primary/30 bg-gradient-to-br from-accent-primary/5 to-accent-primary/10 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-primary/15">
              <Sparkles size={20} className="text-accent-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">
                Daily Digest
              </h3>
              <p className="mt-0.5 text-sm text-text-secondary">
                Generate an AI-powered summary of all {newsletterCount}{" "}
                newsletter{newsletterCount !== 1 ? "s" : ""} — read everything
                in 5 minutes.
              </p>
            </div>
          </div>
          <button
            onClick={onGenerate}
            disabled={newsletterCount === 0}
            className="shrink-0 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-hover disabled:opacity-50"
          >
            Generate Digest
          </button>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="rounded-xl border border-accent-primary/30 bg-gradient-to-br from-accent-primary/5 to-accent-primary/10 p-6">
        <div className="flex items-center gap-3">
          <Loader2 size={20} className="animate-spin text-accent-primary" />
          <div>
            <h3 className="font-semibold text-text-primary">
              Generating Daily Digest...
            </h3>
            <p className="text-sm text-text-tertiary">
              Reading and summarizing {newsletterCount} newsletter
              {newsletterCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-accent-primary/30 bg-bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border-primary px-5 py-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-accent-primary" />
          <h3 className="font-semibold text-text-primary">
            Daily Digest
          </h3>
          <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-xs font-medium text-accent-primary">
            {newsletterCount} sources
          </span>
        </div>
        <button
          onClick={onGenerate}
          className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary"
        >
          <RefreshCw size={12} />
          Regenerate
        </button>
      </div>
      <div className="p-5">
        <div className="prose-sm max-w-none text-sm leading-relaxed text-text-secondary">
          {digest!.split("\n").map((line, i) => {
            if (line.startsWith("## ")) {
              return (
                <h4
                  key={i}
                  className="mb-2 mt-4 first:mt-0 text-base font-semibold text-text-primary"
                >
                  {line.replace("## ", "")}
                </h4>
              );
            }
            if (line.startsWith("- ") || line.startsWith("• ")) {
              return (
                <p key={i} className="mb-1.5 ml-3 flex gap-2">
                  <span className="shrink-0 text-accent-primary">•</span>
                  <span>{line.replace(/^[-•]\s*/, "")}</span>
                </p>
              );
            }
            if (line.trim() === "") return <div key={i} className="h-2" />;
            return (
              <p key={i} className="mb-2">
                {line}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Newsletter Card with Structured Summary ─────────────────
function NewsletterCard({ newsletter }: { newsletter: Newsletter }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRawContent, setShowRawContent] = useState(false);
  const color = getPublicationColor(newsletter.publication);
  const summary = newsletter.summary;

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
          {summary && (
            <p className="mt-1.5 line-clamp-2 text-xs text-text-tertiary">
              {summary.theNews.slice(0, 150)}...
            </p>
          )}
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
          {summary ? (
            <div className="space-y-4">
              {/* The News */}
              <div className="rounded-lg bg-bg-secondary p-3.5">
                <div className="mb-2 flex items-center gap-1.5">
                  <Newspaper size={14} className="text-accent-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent-primary">
                    The News
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-text-primary">
                  {summary.theNews}
                </p>
              </div>

              {/* Why It Matters */}
              <div className="rounded-lg bg-bg-secondary p-3.5">
                <div className="mb-2 flex items-center gap-1.5">
                  <Lightbulb size={14} className="text-accent-warning" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent-warning">
                    Why It Matters
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-text-primary">
                  {summary.whyItMatters}
                </p>
              </div>

              {/* The Context */}
              <div className="rounded-lg bg-bg-secondary p-3.5">
                <div className="mb-2 flex items-center gap-1.5">
                  <Globe size={14} className="text-accent-success" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent-success">
                    The Context
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-text-primary">
                  {summary.theContext}
                </p>
              </div>

              {/* Toggle raw content */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRawContent(!showRawContent);
                }}
                className="text-xs text-text-tertiary hover:text-text-secondary"
              >
                {showRawContent
                  ? "Hide original content"
                  : "Show original content"}
              </button>

              {showRawContent && (
                <div className="max-h-96 overflow-y-auto rounded-lg border border-border-secondary bg-bg-secondary p-3">
                  <div className="whitespace-pre-wrap text-xs leading-relaxed text-text-tertiary">
                    {newsletter.content}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
              {newsletter.content}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main View ───────────────────────────────────────────────
export function NewsletterView({
  newsletters,
  isLoading,
  error,
  onRefresh,
  onIngest,
  isIngesting,
  isGmailConnected,
  onConnectGmail,
  dailyDigest,
  isGeneratingDigest,
  onGenerateDigest,
}: NewsletterViewProps) {
  const [ingestResult, setIngestResult] = useState<{
    fetched: number;
    filtered: number;
    totalEmails: number;
  } | null>(null);

  const handleIngest = async () => {
    const result = await onIngest();
    if (result) {
      setIngestResult(result);
      setTimeout(() => setIngestResult(null), 8000);
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
              {newsletters.length !== 1 ? "s" : ""}
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
          Scanned {ingestResult.totalEmails} emails — found{" "}
          {ingestResult.fetched} newsletter
          {ingestResult.fetched !== 1 ? "s" : ""}, filtered out{" "}
          {ingestResult.filtered} non-newsletter email
          {ingestResult.filtered !== 1 ? "s" : ""}.
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-accent-danger/30 bg-accent-danger/10 px-4 py-3 text-sm text-accent-danger">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Daily Digest */}
      {isGmailConnected && newsletters.length > 0 && (
        <DailyDigestSection
          digest={dailyDigest}
          isGenerating={isGeneratingDigest}
          onGenerate={onGenerateDigest}
          newsletterCount={newsletters.length}
        />
      )}

      {/* Individual newsletter cards */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <NewsletterCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {newsletters.length > 0 && (
            <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wide">
              Individual Newsletters
            </h3>
          )}
          <div className="space-y-3">
            {newsletters.map((nl) => (
              <NewsletterCard key={nl.id} newsletter={nl} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
