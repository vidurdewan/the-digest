"use client";

import { useState, useRef, useEffect } from "react";
import {
  Mail,
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
  Star,
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
  newslettersForSelectedDate: Newsletter[];
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
  vipNewsletters: string[];
  onToggleVip: (publication: string) => void;
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

// ─── 7-Day Date Strip (Restyled: plain text tabs, active underlined) ─
function DateStrip({
  selectedDate,
  onSelect,
}: {
  selectedDate: string | null;
  onSelect: (date: string | null) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Build last 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      dateStr: d.toISOString().slice(0, 10),
      dayAbbr: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
      dayNum: d.getDate(),
      isToday: i === 6,
    };
  });

  const todayStr = days[6].dateStr;
  const activeDate = selectedDate || todayStr;

  // Auto-scroll to center the selected date
  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [activeDate]);

  return (
    <div
      ref={scrollRef}
      className="scrollbar-hide flex items-center gap-1 overflow-x-auto border-b border-border-primary pb-0"
    >
      {days.map((day) => {
        const isActive = activeDate === day.dateStr;
        return (
          <button
            key={day.dateStr}
            ref={isActive ? selectedRef : undefined}
            onClick={() =>
              onSelect(day.dateStr === todayStr ? null : day.dateStr)
            }
            className={`relative shrink-0 px-3 py-2 text-xs font-medium transition-colors ${
              isActive
                ? "text-text-primary"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            <span className="tracking-wider">{day.dayAbbr}</span>
            <span className="ml-1.5 font-semibold">{day.dayNum}</span>
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-text-primary" />
            )}
          </button>
        );
      })}
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
              className="mt-3 mb-2 border-l-2 border-accent-primary px-4 py-2.5"
            >
              <p className="text-xs font-semibold text-text-primary">
                <span className="text-accent-primary">Bottom line: </span>
                <RichText text={blText} />
              </p>
            </div>
          );
        }

        // Bullet points
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

        // One-liner
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

// ─── Daily Digest Section (Restyled: no card bg, ruled section) ──
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
      <div className="space-y-4">
        <DateStrip
          selectedDate={selectedDigestDate}
          onSelect={onSelectDigestDate}

        />
        <div className="border-b border-border-primary pb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Sparkles size={18} className="mt-0.5 text-accent-primary" />
              <div>
                <h3 className="font-serif text-lg font-bold text-text-primary">
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
              className="shrink-0 border-b border-text-primary pb-0.5 text-sm font-medium text-text-primary transition-colors hover:text-accent-primary hover:border-accent-primary disabled:opacity-50"
            >
              Generate
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="space-y-4">
        <DateStrip
          selectedDate={selectedDigestDate}
          onSelect={onSelectDigestDate}

        />
        <div className="border-b border-border-primary pb-6">
          <div className="flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-accent-primary" />
            <div>
              <h3 className="font-serif text-lg font-bold text-text-primary">
                Generating Intelligence Briefing...
              </h3>
              <p className="text-sm text-text-tertiary">
                Analyzing {newsletterCount} newsletter
                {newsletterCount !== 1 ? "s" : ""} with source-weighted analysis
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Determine display date
  const displayDate = selectedDigestDate || new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Date strip */}
      <DateStrip
        selectedDate={selectedDigestDate}
        onSelect={onSelectDigestDate}
      />

      {/* Digest section — no card, ruled */}
      <div className="border-b border-border-primary pb-6">
        {/* Header with date */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-accent-primary" />
              <h3 className="font-serif text-lg font-bold text-text-primary">
                Intelligence Briefing
              </h3>
              <span className="text-xs text-text-tertiary">
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
                  className="p-1.5 text-text-tertiary hover:text-text-primary transition-colors"
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
                  className="p-1.5 text-text-tertiary hover:text-text-primary transition-colors"
                  aria-label="Next day"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
            <button
              onClick={onGenerate}
              className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary hover:text-text-primary transition-colors"
            >
              <RefreshCw size={14} />
              Regenerate
            </button>
          </div>
        </div>

        {/* Digest content */}
        <DigestContent content={digest!} />
      </div>
    </div>
  );
}

/** Extract first sentence from text for preview snippets */
function firstSentence(text: string): string {
  const plain = stripMarkdown(text);
  const match = plain.match(/^(.+?[.!?])\s/);
  return match ? match[1] : plain.slice(0, 120);
}

// ─── Newsletter Item (Restyled: no card, flat ruled list) ─────
function NewsletterItem({
  newsletter,
  onToggleRead,
  onToggleSave,
  isVip,
  onToggleVip,
}: {
  newsletter: Newsletter;
  onToggleRead: (id: string) => void;
  onToggleSave: (id: string) => void;
  isVip: boolean;
  onToggleVip: (publication: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRawContent, setShowRawContent] = useState(false);
  const summary = newsletter.newsletterSummary || newsletter.summary;

  return (
    <div
      className={`border-b border-border-primary py-5 transition-opacity ${
        newsletter.isRead && !isExpanded ? "opacity-60" : ""
      }`}
    >
      <div
        className="cursor-pointer"
        onClick={() => {
          setIsExpanded(!isExpanded);
          if (!isExpanded && !newsletter.isRead) {
            onToggleRead(newsletter.id);
          }
        }}
      >
        {/* Source name (bold) */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-text-primary">
            {newsletter.publication}
          </span>
          {isVip && (
            <Star size={12} className="fill-accent-warning text-accent-warning" />
          )}
          {!newsletter.isRead && (
            <span className="h-1.5 w-1.5 rounded-full bg-accent-primary" />
          )}
        </div>

        {/* Subject line (serif headline) */}
        <h3 className="font-serif text-lg font-semibold leading-snug text-text-primary mb-1">
          {newsletter.subject}
        </h3>

        {/* Preview text */}
        {summary && "theNews" in summary && (
          <p className="text-sm leading-relaxed text-text-secondary line-clamp-2 mb-2">
            {firstSentence((summary as { theNews: string }).theNews)}
          </p>
        )}

        {/* Read time + timestamp */}
        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          {newsletter.readingTimeMinutes && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {newsletter.readingTimeMinutes} min
            </span>
          )}
          <span>{getRelativeTime(newsletter.receivedAt)}</span>
        </div>

        {/* Action buttons */}
        <div className="newsletter-actions mt-2 flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleRead(newsletter.id);
            }}
            className={`text-xs transition-colors ${
              newsletter.isRead
                ? "text-accent-success"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {newsletter.isRead ? (
              <span className="flex items-center gap-1"><CheckCheck size={12} /> Read</span>
            ) : (
              <span className="flex items-center gap-1"><Check size={12} /> Mark read</span>
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(newsletter.id);
            }}
            className={`text-xs transition-colors ${
              newsletter.isSaved
                ? "text-accent-primary"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {newsletter.isSaved ? (
              <span className="flex items-center gap-1"><BookmarkCheck size={12} /> Saved</span>
            ) : (
              <span className="flex items-center gap-1"><Bookmark size={12} /> Save</span>
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVip(newsletter.publication);
            }}
            className={`text-xs transition-colors ${
              isVip
                ? "text-accent-warning"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            <span className="flex items-center gap-1">
              <Star size={12} className={isVip ? "fill-accent-warning" : ""} />
              {isVip ? "VIP" : "Pin"}
            </span>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pl-0">
          {summary && "theNews" in summary ? (
            <div className="space-y-4">
              {/* The News */}
              <div>
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
              <div>
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
              <div>
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
                  <div className="border-l-2 border-accent-primary/40 pl-4 py-2">
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
                  <div>
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

              {/* Recruiter Relevance */}
              {"recruiterRelevance" in summary &&
                (summary as { recruiterRelevance?: string })
                  .recruiterRelevance &&
                (
                  summary as { recruiterRelevance: string }
                ).recruiterRelevance.toLowerCase() !==
                  "no direct signals." && (
                  <div className="border-l border-border-primary pl-4 py-2">
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
                <div className="max-h-96 overflow-y-auto border-t border-border-primary pt-3">
                  <div className="whitespace-pre-wrap text-xs leading-relaxed text-text-tertiary">
                    {newsletter.content}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
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
  newslettersForSelectedDate,
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
  vipNewsletters,
  onToggleVip,
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

  const vipSet = new Set(vipNewsletters);

  // Use date-filtered newsletters for the card list
  const dateNewsletters = newslettersForSelectedDate;

  const filteredNewsletters = dateNewsletters
    .filter((nl) => {
      if (filterMode === "unread") return !nl.isRead;
      if (filterMode === "saved") return nl.isSaved;
      return true;
    })
    .sort((a, b) => {
      const aVip = vipSet.has(a.publication) ? 0 : 1;
      const bVip = vipSet.has(b.publication) ? 0 : 1;
      return aVip - bVip;
    });

  const unreadCount = dateNewsletters.filter((nl) => !nl.isRead).length;
  const savedCount = dateNewsletters.filter((nl) => nl.isSaved).length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-serif text-3xl font-bold text-text-primary tracking-tight">
            Newsletters
          </h2>
          <p className="mt-1 text-sm text-text-tertiary">
            {dateNewsletters.length} newsletter
            {dateNewsletters.length !== 1 ? "s" : ""}
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
              className="flex items-center gap-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
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
            className="p-2 text-text-tertiary hover:text-text-secondary transition-colors disabled:opacity-50"
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
        <div className="border-b border-border-primary pb-6">
          <div className="flex items-start gap-4">
            <Mail size={20} className="mt-0.5 text-accent-primary" />
            <div className="flex-1">
              <h3 className="font-serif text-lg font-bold text-text-primary">
                Connect Gmail to see your newsletters
              </h3>
              <p className="mt-1 text-sm text-text-secondary leading-relaxed">
                Connect a Gmail account dedicated to newsletters. The app will
                automatically fetch and parse your subscriptions.
              </p>
              <button
                onClick={onConnectGmail}
                className="mt-4 border-b border-accent-primary pb-0.5 text-sm font-medium text-accent-primary transition-colors hover:text-accent-primary-hover"
              >
                Connect Gmail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ingest result message */}
      {ingestResult && (
        <div className="border-l-2 border-accent-success pl-4 py-2 text-sm text-accent-success">
          Scanned {ingestResult.totalEmails} emails — found{" "}
          {ingestResult.fetched} newsletter
          {ingestResult.fetched !== 1 ? "s" : ""}, filtered out{" "}
          {ingestResult.filtered} non-newsletter email
          {ingestResult.filtered !== 1 ? "s" : ""}.
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 border-l-2 border-accent-danger pl-4 py-2 text-sm text-accent-danger">
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
          newsletterCount={dateNewsletters.length}
          digestHistory={digestHistory}
          selectedDigestDate={selectedDigestDate}
          onSelectDigestDate={onSelectDigestDate}

        />
      )}

      {/* Filter tabs — plain text, active underlined */}
      {dateNewsletters.length > 0 && (
        <div className="flex items-center gap-1 border-b border-border-primary">
          {(
            [
              { key: "all", label: "All", count: dateNewsletters.length },
              { key: "unread", label: "Unread", count: unreadCount },
              { key: "saved", label: "Saved", count: savedCount },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterMode(tab.key)}
              className={`relative px-3 py-2 text-xs font-medium transition-colors ${
                filterMode === tab.key
                  ? "text-text-primary"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 text-[10px] opacity-70">
                  {tab.count}
                </span>
              )}
              {filterMode === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-text-primary" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Individual newsletter items — flat ruled list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <NewsletterCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div>
          {filteredNewsletters.length === 0 && filterMode !== "all" && (
            <div className="py-12 text-center">
              <p className="text-sm text-text-tertiary">
                {filterMode === "unread"
                  ? "All caught up! No unread newsletters."
                  : "No saved newsletters yet."}
              </p>
            </div>
          )}
          {filteredNewsletters.map((nl) => (
            <NewsletterItem
              key={nl.id}
              newsletter={nl}
              onToggleRead={onToggleRead}
              onToggleSave={onToggleSave}
              isVip={vipSet.has(nl.publication)}
              onToggleVip={onToggleVip}
            />
          ))}
        </div>
      )}
    </div>
  );
}
