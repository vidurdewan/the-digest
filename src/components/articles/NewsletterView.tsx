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
  Zap,
  Eye,
  Bookmark,
  BookmarkCheck,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertTriangle,
  Target,
} from "lucide-react";
import type { Newsletter } from "@/types";
import { getRelativeTime } from "@/lib/mock-data";
import { NewsletterCardSkeleton } from "@/components/ui/LoadingSkeleton";

interface StoredDigest {
  date: string;
  digest: string;
  newsletterCount: number;
  generatedAt: string;
}

interface NewsletterViewProps {
  newsletters: Newsletter[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onIngest: () => Promise<{
    fetched: number;
    filtered: number;
    totalEmails: number;
  } | null>;
  isIngesting: boolean;
  isGmailConnected: boolean;
  onConnectGmail: () => void;
  dailyDigest: string | null;
  isGeneratingDigest: boolean;
  onGenerateDigest: () => Promise<void>;
  // Historical digests
  digestHistory: StoredDigest[];
  selectedDigestDate: string | null;
  onSelectDigestDate: (date: string | null) => void;
  // Read/save
  onToggleRead: (id: string) => void;
  onToggleSave: (id: string) => void;
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
  Stratechery: "#4f46e5",
  "The Economist": "#e11d48",
  Reuters: "#f97316",
  TechCrunch: "#22c55e",
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

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().slice(0, 10)) return "Today";
  if (dateStr === yesterday.toISOString().slice(0, 10)) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ─── Digest History Navigation ──────────────────────────────
function DigestHistoryNav({
  history,
  selectedDate,
  onSelect,
}: {
  history: StoredDigest[];
  selectedDate: string | null;
  onSelect: (date: string | null) => void;
}) {
  if (history.length <= 1) return null;

  const currentIdx = selectedDate
    ? history.findIndex((d) => d.date === selectedDate)
    : 0;

  return (
    <div className="flex items-center gap-2">
      <Calendar size={14} className="text-text-tertiary" />
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            const prev = currentIdx + 1;
            if (prev < history.length) onSelect(history[prev].date);
          }}
          disabled={currentIdx >= history.length - 1}
          className="rounded p-1 text-text-tertiary hover:text-text-primary disabled:opacity-30"
        >
          <ChevronLeft size={14} />
        </button>
        <select
          value={selectedDate || history[0]?.date || ""}
          onChange={(e) =>
            onSelect(e.target.value === history[0]?.date ? null : e.target.value)
          }
          className="rounded border border-border-primary bg-bg-secondary px-2 py-0.5 text-xs text-text-secondary"
        >
          {history.map((d) => (
            <option key={d.date} value={d.date}>
              {formatDateLabel(d.date)} ({d.newsletterCount} sources)
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            const next = currentIdx - 1;
            if (next >= 0) onSelect(history[next].date);
            if (next < 0) onSelect(null);
          }}
          disabled={currentIdx <= 0 && !selectedDate}
          className="rounded p-1 text-text-tertiary hover:text-text-primary disabled:opacity-30"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Daily Digest Section ────────────────────────────────────
function DailyDigestSection({
  digest,
  isGenerating,
  onGenerate,
  newsletterCount,
  digestHistory,
  selectedDigestDate,
  onSelectDigestDate,
}: {
  digest: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
  newsletterCount: number;
  digestHistory: StoredDigest[];
  selectedDigestDate: string | null;
  onSelectDigestDate: (date: string | null) => void;
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
              <h3 className="font-semibold text-text-primary">Daily Digest</h3>
              <p className="mt-0.5 text-sm text-text-secondary">
                Generate an AI-powered intelligence briefing from all{" "}
                {newsletterCount} newsletter
                {newsletterCount !== 1 ? "s" : ""} — deep analysis with
                recruiter-relevant insights, contrarian takes, and source-weighted
                prioritization.
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
        {digestHistory.length > 0 && (
          <div className="mt-3 border-t border-accent-primary/20 pt-3">
            <DigestHistoryNav
              history={digestHistory}
              selectedDate={selectedDigestDate}
              onSelect={onSelectDigestDate}
            />
          </div>
        )}
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
              Generating Intelligence Briefing...
            </h3>
            <p className="text-sm text-text-tertiary">
              Analyzing {newsletterCount} newsletter
              {newsletterCount !== 1 ? "s" : ""} with source-weighted deep analysis
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
            Intelligence Briefing
          </h3>
          <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-xs font-medium text-accent-primary">
            {newsletterCount} sources
          </span>
        </div>
        <div className="flex items-center gap-3">
          <DigestHistoryNav
            history={digestHistory}
            selectedDate={selectedDigestDate}
            onSelect={onSelectDigestDate}
          />
          <button
            onClick={onGenerate}
            className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary"
          >
            <RefreshCw size={12} />
            Regenerate
          </button>
        </div>
      </div>
      <div className="p-5">
        <div className="prose-sm max-w-none text-sm leading-relaxed text-text-secondary">
          {digest!.split("\n").map((line, i) => {
            if (line.startsWith("## Relevant to My Work")) {
              return (
                <h4
                  key={i}
                  className="mb-2 mt-4 first:mt-0 flex items-center gap-2 text-base font-semibold text-accent-danger"
                >
                  <Target size={16} className="text-accent-danger" />
                  {line.replace("## ", "")}
                </h4>
              );
            }
            if (line.startsWith("## Contrarian Take")) {
              return (
                <h4
                  key={i}
                  className="mb-2 mt-4 flex items-center gap-2 text-base font-semibold text-accent-warning"
                >
                  <AlertTriangle size={16} className="text-accent-warning" />
                  {line.replace("## ", "")}
                </h4>
              );
            }
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
              // Check for bold **So What:** pattern
              const soWhatMatch = line.match(
                /^[-•]\s*(.*?)(\*\*So What:\*\*.*)/
              );
              if (soWhatMatch) {
                return (
                  <p key={i} className="mb-1.5 ml-3 flex gap-2">
                    <span className="shrink-0 text-accent-primary">•</span>
                    <span>
                      {soWhatMatch[1]}
                      <strong className="text-text-primary">
                        {soWhatMatch[2]
                          .replace(/\*\*/g, "")}
                      </strong>
                    </span>
                  </p>
                );
              }
              return (
                <p key={i} className="mb-1.5 ml-3 flex gap-2">
                  <span className="shrink-0 text-accent-primary">•</span>
                  <span>{line.replace(/^[-•]\s*/, "")}</span>
                </p>
              );
            }
            if (line.trim() === "") return <div key={i} className="h-2" />;
            // Bold text rendering
            const parts = line.split(/(\*\*[^*]+\*\*)/g);
            return (
              <p key={i} className="mb-2">
                {parts.map((part, j) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return (
                      <strong key={j} className="text-text-primary">
                        {part.slice(2, -2)}
                      </strong>
                    );
                  }
                  return part;
                })}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Newsletter Card with Enhanced Summary ───────────────────
function NewsletterCard({
  newsletter,
  onToggleRead,
  onToggleSave,
}: {
  newsletter: Newsletter;
  onToggleRead: (id: string) => void;
  onToggleSave: (id: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRawContent, setShowRawContent] = useState(false);
  const color = getPublicationColor(newsletter.publication);
  const summary = newsletter.newsletterSummary || newsletter.summary;

  return (
    <div
      className={`rounded-xl border bg-bg-card transition-all duration-200 ${
        isExpanded
          ? "border-accent-primary/30 shadow-md"
          : newsletter.isRead
            ? "border-border-primary opacity-75 hover:opacity-100 hover:shadow-sm"
            : "border-border-primary hover:shadow-sm"
      }`}
    >
      <div
        className="flex cursor-pointer items-start gap-3 p-4 sm:p-5"
        onClick={() => {
          setIsExpanded(!isExpanded);
          if (!isExpanded && !newsletter.isRead) {
            onToggleRead(newsletter.id);
          }
        }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {publicationInitials(newsletter.publication)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-primary">
                {newsletter.publication}
              </h3>
              {!newsletter.isRead && (
                <span className="h-2 w-2 rounded-full bg-accent-primary" />
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {newsletter.readingTimeMinutes && (
                <span className="flex items-center gap-1 text-xs text-text-tertiary">
                  <Clock size={11} />
                  {newsletter.readingTimeMinutes} min
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-text-tertiary">
                <Clock size={12} />
                {getRelativeTime(newsletter.receivedAt)}
              </span>
            </div>
          </div>
          <p className="mt-0.5 truncate text-sm text-text-secondary">
            {newsletter.subject}
          </p>
          {summary && "theNews" in summary && (
            <p className="mt-1.5 line-clamp-2 text-xs text-text-tertiary">
              {(summary as { theNews: string }).theNews.slice(0, 150)}...
            </p>
          )}

          {/* Action buttons */}
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleRead(newsletter.id);
              }}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
                newsletter.isRead
                  ? "bg-accent-success/10 text-accent-success"
                  : "bg-bg-secondary text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {newsletter.isRead ? (
                <CheckCheck size={12} />
              ) : (
                <Check size={12} />
              )}
              {newsletter.isRead ? "Read" : "Mark read"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(newsletter.id);
              }}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
                newsletter.isSaved
                  ? "bg-accent-primary/10 text-accent-primary"
                  : "bg-bg-secondary text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {newsletter.isSaved ? (
                <BookmarkCheck size={12} />
              ) : (
                <Bookmark size={12} />
              )}
              {newsletter.isSaved ? "Saved" : "Save"}
            </button>
          </div>
        </div>

        <button className="shrink-0 rounded-md p-1 text-text-tertiary transition-colors hover:text-text-primary">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-border-secondary px-4 py-4 sm:px-5">
          {summary && "theNews" in summary ? (
            <div className="space-y-4">
              {/* Recruiter Relevance — shown first if present */}
              {"recruiterRelevance" in summary &&
                (summary as { recruiterRelevance?: string })
                  .recruiterRelevance &&
                (
                  summary as { recruiterRelevance: string }
                ).recruiterRelevance.toLowerCase() !==
                  "no direct recruiting signals." && (
                  <div className="rounded-lg border border-accent-danger/20 bg-accent-danger/5 p-3.5">
                    <div className="mb-2 flex items-center gap-1.5">
                      <Target size={14} className="text-accent-danger" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-accent-danger">
                        Relevant to My Work
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-text-primary">
                      {
                        (summary as { recruiterRelevance: string })
                          .recruiterRelevance
                      }
                    </p>
                  </div>
                )}

              {/* The News */}
              <div className="rounded-lg bg-bg-secondary p-3.5">
                <div className="mb-2 flex items-center gap-1.5">
                  <Newspaper size={14} className="text-accent-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent-primary">
                    The News
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-text-primary">
                  {(summary as { theNews: string }).theNews}
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
                  {(summary as { whyItMatters: string }).whyItMatters}
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
                  {(summary as { theContext: string }).theContext}
                </p>
              </div>

              {/* So What? */}
              {"soWhat" in summary &&
                (summary as { soWhat?: string }).soWhat && (
                  <div className="rounded-lg border border-accent-primary/20 bg-accent-primary/5 p-3.5">
                    <div className="mb-2 flex items-center gap-1.5">
                      <Zap size={14} className="text-accent-primary" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-accent-primary">
                        So What?
                      </span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed text-text-primary">
                      {(summary as { soWhat: string }).soWhat}
                    </p>
                  </div>
                )}

              {/* Watch Next */}
              {"watchNext" in summary &&
                (summary as { watchNext?: string }).watchNext && (
                  <div className="rounded-lg bg-bg-secondary p-3.5">
                    <div className="mb-2 flex items-center gap-1.5">
                      <Eye size={14} className="text-text-tertiary" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                        Watch Next
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-text-secondary">
                      {(summary as { watchNext: string }).watchNext}
                    </p>
                  </div>
                )}

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
  digestHistory,
  selectedDigestDate,
  onSelectDigestDate,
  onToggleRead,
  onToggleSave,
}: NewsletterViewProps) {
  const [ingestResult, setIngestResult] = useState<{
    fetched: number;
    filtered: number;
    totalEmails: number;
  } | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "unread" | "saved">(
    "all"
  );

  const handleIngest = async () => {
    const result = await onIngest();
    if (result) {
      setIngestResult(result);
      setTimeout(() => setIngestResult(null), 8000);
    }
  };

  const filteredNewsletters = newsletters.filter((nl) => {
    if (filterMode === "unread") return !nl.isRead;
    if (filterMode === "saved") return nl.isSaved;
    return true;
  });

  const unreadCount = newsletters.filter((nl) => !nl.isRead).length;
  const savedCount = newsletters.filter((nl) => nl.isSaved).length;

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
              {newsletters.length !== 1 ? "s" : ""} ·{" "}
              {unreadCount > 0 && (
                <span className="text-accent-primary">
                  {unreadCount} unread
                </span>
              )}
              {unreadCount === 0 && "all read"}
              {savedCount > 0 && (
                <span className="text-text-tertiary">
                  {" "}
                  · {savedCount} saved
                </span>
              )}
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
            <Mail
              size={20}
              className="mt-0.5 shrink-0 text-accent-primary"
            />
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
          digestHistory={digestHistory}
          selectedDigestDate={selectedDigestDate}
          onSelectDigestDate={onSelectDigestDate}
        />
      )}

      {/* Filter tabs */}
      {newsletters.length > 0 && (
        <div className="flex items-center gap-1 border-b border-border-primary pb-0">
          {(
            [
              { key: "all", label: "All", count: newsletters.length },
              { key: "unread", label: "Unread", count: unreadCount },
              { key: "saved", label: "Saved", count: savedCount },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterMode(tab.key)}
              className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                filterMode === tab.key
                  ? "border-accent-primary text-accent-primary"
                  : "border-transparent text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 rounded-full bg-bg-secondary px-1.5 py-0.5 text-[10px]">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Individual newsletter cards */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <NewsletterCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNewsletters.length === 0 && filterMode !== "all" && (
            <div className="rounded-lg border border-border-primary bg-bg-card p-8 text-center">
              <p className="text-sm text-text-tertiary">
                {filterMode === "unread"
                  ? "All caught up! No unread newsletters."
                  : "No saved newsletters yet."}
              </p>
            </div>
          )}
          {filteredNewsletters.map((nl) => (
            <NewsletterCard
              key={nl.id}
              newsletter={nl}
              onToggleRead={onToggleRead}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
