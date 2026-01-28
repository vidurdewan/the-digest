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
  AlertTriangle,
  Briefcase,
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
  digestHistory: StoredDigest[];
  selectedDigestDate: string | null;
  onSelectDigestDate: (date: string | null) => void;
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

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Strip markdown bold/italic markers for plain-text previews */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]/g, "$1");
}

// ─── Source Citation Badge ────────────────────────────────────
function SourceBadge({ name }: { name: string }) {
  return (
    <span className="ml-0.5 inline-flex items-center rounded bg-accent-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-primary">
      {name}
    </span>
  );
}

// ─── Inline Markdown Renderer ────────────────────────────────
// Renders **bold**, *italic*, and [Source Name] citation badges
function RichText({ text }: { text: string }) {
  // Split on bold (**text**), italic (*text* but not **), and source citations [Source]
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\])/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-text-primary">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (
          part.startsWith("*") &&
          part.endsWith("*") &&
          !part.startsWith("**")
        ) {
          return (
            <em key={i} className="text-text-secondary">
              {part.slice(1, -1)}
            </em>
          );
        }
        // Source citation: [Source Name]
        if (part.startsWith("[") && part.endsWith("]")) {
          const sourceName = part.slice(1, -1);
          // Skip numeric refs like [1], [2] etc
          if (/^\d+$/.test(sourceName)) {
            return <span key={i}>{part}</span>;
          }
          return <SourceBadge key={i} name={sourceName} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ─── Day Tabs for Digest History ─────────────────────────────
function DigestDayTabs({
  history,
  selectedDate,
  onSelect,
}: {
  history: StoredDigest[];
  selectedDate: string | null;
  onSelect: (date: string | null) => void;
}) {
  if (history.length === 0) return null;

  // Show up to 7 recent days as tabs, rest in a dropdown
  const tabDays = history.slice(0, 7);
  const moreDays = history.slice(7);
  const activeDate = selectedDate || history[0]?.date;

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {tabDays.map((d) => (
        <button
          key={d.date}
          onClick={() =>
            onSelect(d.date === history[0]?.date ? null : d.date)
          }
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            activeDate === d.date
              ? "bg-accent-primary text-text-inverse"
              : "bg-bg-secondary text-text-tertiary hover:text-text-secondary"
          }`}
        >
          {formatDateLabel(d.date)}
        </button>
      ))}
      {moreDays.length > 0 && (
        <select
          value={
            moreDays.some((d) => d.date === activeDate)
              ? activeDate
              : ""
          }
          onChange={(e) => {
            if (e.target.value) onSelect(e.target.value);
          }}
          className="shrink-0 rounded-lg border border-border-primary bg-bg-secondary px-2 py-1.5 text-xs text-text-tertiary"
        >
          <option value="">Older...</option>
          {moreDays.map((d) => (
            <option key={d.date} value={d.date}>
              {formatDateLabel(d.date)} ({d.newsletterCount})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

// ─── Digest Content Renderer ─────────────────────────────────
// Renders the markdown digest with proper visual hierarchy
function DigestContent({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Empty line = spacer
        if (trimmed === "") return <div key={i} className="h-3" />;

        // Section headers
        if (trimmed.startsWith("## Work Radar")) {
          return (
            <div key={i} className="mt-6 mb-2 flex items-center gap-2">
              <Briefcase size={15} className="text-text-tertiary" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                {trimmed.replace("## ", "")}
              </h4>
            </div>
          );
        }
        if (trimmed.startsWith("## Contrarian Take")) {
          return (
            <div key={i} className="mt-6 mb-2 flex items-center gap-2">
              <AlertTriangle size={16} className="text-accent-warning" />
              <h4 className="text-sm font-bold text-accent-warning">
                {trimmed.replace("## ", "")}
              </h4>
            </div>
          );
        }
        if (trimmed.startsWith("## Today's One-Liner")) {
          return (
            <h4
              key={i}
              className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-tertiary"
            >
              {trimmed.replace("## ", "")}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h4
              key={i}
              className="mt-6 mb-3 border-b border-border-primary pb-2 text-sm font-bold text-text-primary"
            >
              {trimmed.replace("## ", "")}
            </h4>
          );
        }

        // "→ So What:" lines — render as subtle callout
        if (
          trimmed.startsWith("→ So What:") ||
          trimmed.startsWith("→ So what:")
        ) {
          const soWhatText = trimmed.replace(/^→\s*So [Ww]hat:\s*/, "");
          return (
            <div
              key={i}
              className="mb-4 ml-7 rounded-md border-l-2 border-accent-primary/30 bg-accent-primary/5 px-3 py-1.5"
            >
              <p className="text-xs italic text-text-secondary">
                <span className="font-semibold not-italic text-accent-primary">
                  So What:{" "}
                </span>
                <RichText text={soWhatText} />
              </p>
            </div>
          );
        }

        // "Bottom line:" — render as bold callout
        if (
          trimmed.startsWith("Bottom line:") ||
          trimmed.startsWith("**Bottom line:**")
        ) {
          const blText = trimmed
            .replace(/^\*?\*?Bottom line:\*?\*?\s*/, "");
          return (
            <div
              key={i}
              className="mt-3 mb-2 rounded-lg bg-bg-secondary px-4 py-2.5"
            >
              <p className="text-xs font-semibold text-text-primary">
                <span className="text-accent-primary">Bottom line: </span>
                <RichText text={blText} />
              </p>
            </div>
          );
        }

        // Bullet points — each bullet gets more spacing
        // Also handle inline "→ So What:" by splitting it out
        if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
          const bulletText = trimmed.replace(/^[-•]\s*/, "");

          // Check if "→ So What:" is inline — split it out
          const soWhatMatch = bulletText.match(
            /(.+?)\s*→\s*So [Ww]hat:\s*([\s\S]*)/
          );
          if (soWhatMatch) {
            const storyPart = soWhatMatch[1].trim();
            const soWhatPart = soWhatMatch[2].trim();
            return (
              <div key={i} className="mb-1">
                <div className="ml-3 flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-primary/60" />
                  <p className="text-sm leading-relaxed text-text-secondary">
                    <RichText text={storyPart} />
                  </p>
                </div>
                <div className="mb-4 ml-7 mt-1.5 rounded-md border-l-2 border-accent-primary/30 bg-accent-primary/5 px-3 py-1.5">
                  <p className="text-xs italic text-text-secondary">
                    <span className="font-semibold not-italic text-accent-primary">
                      So What:{" "}
                    </span>
                    <RichText text={soWhatPart} />
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div key={i} className="mb-1 ml-3 flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-primary/60" />
              <p className="text-sm leading-relaxed text-text-secondary">
                <RichText text={bulletText} />
              </p>
            </div>
          );
        }

        // One-liner (first non-header text after "Today's One-Liner")
        // Check if previous line was the one-liner header
        const prevLine = i > 0 ? lines[i - 1]?.trim() : "";
        if (prevLine === "## Today's One-Liner") {
          return (
            <p
              key={i}
              className="mb-4 border-l-4 border-accent-primary pl-4 text-base font-medium leading-relaxed text-text-primary"
            >
              <RichText text={trimmed} />
            </p>
          );
        }

        // Regular paragraph
        return (
          <p key={i} className="mb-2 text-sm leading-relaxed text-text-secondary">
            <RichText text={trimmed} />
          </p>
        );
      })}
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
      <div className="space-y-3">
        <div className="rounded-2xl border border-border-secondary bg-bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-secondary">
                <Sparkles size={20} className="text-accent-primary" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary">
                  Intelligence Briefing
                </h3>
                <p className="mt-0.5 text-sm text-text-secondary">
                  Generate a source-weighted daily briefing from {newsletterCount}{" "}
                  newsletter{newsletterCount !== 1 ? "s" : ""}.
                </p>
              </div>
            </div>
            <button
              onClick={onGenerate}
              disabled={newsletterCount === 0}
              className="shrink-0 rounded-xl border border-border-primary px-5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary disabled:opacity-50"
            >
              Generate
            </button>
          </div>
        </div>
        {digestHistory.length > 0 && (
          <DigestDayTabs
            history={digestHistory}
            selectedDate={selectedDigestDate}
            onSelect={onSelectDigestDate}
          />
        )}
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="rounded-2xl border border-border-secondary bg-bg-card p-6">
        <div className="flex items-center gap-3">
          <Loader2 size={20} className="animate-spin text-accent-primary" />
          <div>
            <h3 className="font-bold text-text-primary">
              Generating Intelligence Briefing...
            </h3>
            <p className="text-sm text-text-tertiary">
              Analyzing {newsletterCount} newsletter
              {newsletterCount !== 1 ? "s" : ""} with source-weighted analysis
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Determine display date
  const displayDate = selectedDigestDate || new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-3">
      {/* Day tabs */}
      {digestHistory.length > 1 && (
        <DigestDayTabs
          history={digestHistory}
          selectedDate={selectedDigestDate}
          onSelect={onSelectDigestDate}
        />
      )}

      {/* Digest card */}
      <div className="rounded-2xl border border-border-secondary bg-bg-card shadow-sm">
        {/* Header with date */}
        <div className="border-b border-border-primary px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-accent-primary" />
                <h3 className="text-sm font-bold text-text-primary">
                  Intelligence Briefing
                </h3>
                <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] font-medium text-accent-primary">
                  {newsletterCount} sources
                </span>
              </div>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {formatFullDate(displayDate)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {digestHistory.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const currentIdx = digestHistory.findIndex(
                        (d) => d.date === displayDate
                      );
                      const prev = currentIdx + 1;
                      if (prev < digestHistory.length)
                        onSelectDigestDate(digestHistory[prev].date);
                    }}
                    className="rounded-lg p-2 text-text-tertiary hover:bg-bg-secondary hover:text-text-primary transition-colors"
                    aria-label="Previous day"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => {
                      const currentIdx = digestHistory.findIndex(
                        (d) => d.date === displayDate
                      );
                      const next = currentIdx - 1;
                      if (next >= 0) onSelectDigestDate(digestHistory[next].date);
                      if (next < 0) onSelectDigestDate(null);
                    }}
                    className="rounded-lg p-2 text-text-tertiary hover:bg-bg-secondary hover:text-text-primary transition-colors"
                    aria-label="Next day"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
              <button
                onClick={onGenerate}
                className="flex items-center gap-1.5 rounded-xl border border-border-primary px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors"
              >
                <RefreshCw size={14} />
                Regenerate
              </button>
            </div>
          </div>
        </div>

        {/* Digest content */}
        <div className="px-5 py-5">
          <DigestContent content={digest!} />
        </div>
      </div>
    </div>
  );
}

// ─── Newsletter Card ─────────────────────────────────────────
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
      className={`newsletter-card rounded-2xl border bg-bg-card transition-all duration-200 ${
        isExpanded
          ? "border-border-primary shadow-md"
          : newsletter.isRead
            ? "border-border-secondary opacity-75 hover:opacity-100 hover:shadow-sm"
            : "border-border-secondary hover:border-border-primary hover:shadow-sm"
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
              {stripMarkdown((summary as { theNews: string }).theNews).slice(0, 150)}...
            </p>
          )}

          {/* Action buttons — visible on hover */}
          <div className="newsletter-actions mt-2 flex items-center gap-2">
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
              {/* The News */}
              <div className="rounded-lg bg-bg-secondary p-3.5">
                <div className="mb-2 flex items-center gap-1.5">
                  <Newspaper size={14} className="text-accent-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent-primary">
                    The News
                  </span>
                </div>
                <div className="text-sm leading-relaxed text-text-primary">
                  <RichText
                    text={(summary as { theNews: string }).theNews}
                  />
                </div>
              </div>

              {/* Why It Matters */}
              <div className="rounded-lg bg-bg-secondary p-3.5">
                <div className="mb-2 flex items-center gap-1.5">
                  <Lightbulb size={14} className="text-accent-warning" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent-warning">
                    Why It Matters
                  </span>
                </div>
                <div className="text-sm leading-relaxed text-text-primary">
                  <RichText
                    text={
                      (summary as { whyItMatters: string }).whyItMatters
                    }
                  />
                </div>
              </div>

              {/* The Context */}
              <div className="rounded-lg bg-bg-secondary p-3.5">
                <div className="mb-2 flex items-center gap-1.5">
                  <Globe size={14} className="text-accent-success" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent-success">
                    The Context
                  </span>
                </div>
                <div className="text-sm leading-relaxed text-text-primary">
                  <RichText
                    text={(summary as { theContext: string }).theContext}
                  />
                </div>
              </div>

              {/* So What? */}
              {"soWhat" in summary &&
                (summary as { soWhat?: string }).soWhat && (
                  <div className="rounded-lg border-l-2 border-accent-primary/40 bg-accent-primary/5 px-4 py-3">
                    <div className="mb-1 flex items-center gap-1.5">
                      <Zap size={13} className="text-accent-primary" />
                      <span className="text-xs font-semibold text-accent-primary">
                        So What?
                      </span>
                    </div>
                    <p className="text-sm font-medium italic leading-relaxed text-text-primary">
                      <RichText
                        text={(summary as { soWhat: string }).soWhat}
                      />
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
                    <div className="text-sm leading-relaxed text-text-secondary">
                      <RichText
                        text={
                          (summary as { watchNext: string }).watchNext
                        }
                      />
                    </div>
                  </div>
                )}

              {/* Recruiter Relevance — small callout at bottom if present */}
              {"recruiterRelevance" in summary &&
                (summary as { recruiterRelevance?: string })
                  .recruiterRelevance &&
                (
                  summary as { recruiterRelevance: string }
                ).recruiterRelevance.toLowerCase() !==
                  "no direct signals." && (
                  <div className="rounded-lg border border-border-secondary bg-bg-secondary/50 p-3">
                    <div className="mb-1 flex items-center gap-1.5">
                      <Briefcase size={12} className="text-text-tertiary" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                        Work Radar
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-text-tertiary">
                      <RichText
                        text={
                          (summary as { recruiterRelevance: string })
                            .recruiterRelevance
                        }
                      />
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
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">
            Newsletters
          </h2>
          <p className="mt-1 text-sm text-text-tertiary">
            {newsletters.length} newsletter
            {newsletters.length !== 1 ? "s" : ""}
            {unreadCount > 0 && (
              <span className="text-accent-primary">
                {" "}&middot; {unreadCount} unread
              </span>
            )}
            {savedCount > 0 && (
              <span>
                {" "}&middot; {savedCount} saved
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isGmailConnected && (
            <button
              onClick={handleIngest}
              disabled={isIngesting}
              className="flex items-center gap-1.5 rounded-xl border border-border-primary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover disabled:opacity-50"
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
            className="rounded-lg p-2 text-text-tertiary hover:text-text-secondary hover:bg-bg-secondary transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={isLoading ? "animate-spin" : ""}
            />
          </button>
        </div>
      </div>

      {/* Gmail connection prompt */}
      {!isGmailConnected && (
        <div className="rounded-2xl border border-border-secondary bg-bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-secondary">
              <Mail size={20} className="text-accent-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-text-primary">
                Connect Gmail to see your newsletters
              </h3>
              <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                Connect a Gmail account dedicated to newsletters. The app will
                automatically fetch and parse your subscriptions.
              </p>
              <button
                onClick={onConnectGmail}
                className="mt-4 rounded-xl bg-accent-primary px-5 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-hover"
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
        <div className="flex items-center gap-1">
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
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterMode === tab.key
                  ? "bg-accent-secondary text-accent-primary"
                  : "text-text-tertiary hover:text-text-secondary hover:bg-bg-secondary"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 text-[10px] opacity-70">
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
