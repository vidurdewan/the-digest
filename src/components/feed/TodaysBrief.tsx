"use client";

import { useState } from "react";
import { RefreshCw, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useTodaysBrief } from "@/hooks/useTodaysBrief";

// Parse brief text into structured sections
function parseBrief(text: string): { tldr: string | null; sections: { heading: string | null; content: string[] }[] } {
  const lines = text.split("\n").filter((l) => l.trim());
  let tldr: string | null = null;
  const sections: { heading: string | null; content: string[] }[] = [];
  let currentSection: { heading: string | null; content: string[] } = { heading: null, content: [] };

  for (const line of lines) {
    const trimmed = line.trim();

    // TL;DR line
    if (trimmed.toLowerCase().startsWith("tl;dr") || trimmed.toLowerCase().startsWith("tldr")) {
      tldr = trimmed.replace(/^tl;?dr:?\s*/i, "");
      continue;
    }

    // Section headers (## Header or **Header**)
    if (trimmed.startsWith("## ")) {
      if (currentSection.content.length > 0 || currentSection.heading) {
        sections.push(currentSection);
      }
      currentSection = { heading: trimmed.replace("## ", ""), content: [] };
      continue;
    }

    // Bold-only lines as section headers
    if (trimmed.startsWith("**") && trimmed.endsWith("**") && !trimmed.includes("**", 2)) {
      if (currentSection.content.length > 0 || currentSection.heading) {
        sections.push(currentSection);
      }
      currentSection = { heading: trimmed.replace(/\*\*/g, ""), content: [] };
      continue;
    }

    currentSection.content.push(trimmed);
  }

  if (currentSection.content.length > 0 || currentSection.heading) {
    sections.push(currentSection);
  }

  // If no TL;DR found, use first non-header line
  if (!tldr && sections.length > 0 && sections[0].content.length > 0) {
    tldr = sections[0].content[0];
    sections[0].content = sections[0].content.slice(1);
  }

  return { tldr, sections };
}

// Render inline markdown — bold, italic
function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold text-text-primary">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function BriefContent({ content }: { content: string }) {
  const { tldr, sections } = parseBrief(content);

  return (
    <div className="space-y-4">
      {/* TL;DR — highlighted one-liner */}
      {tldr && (
        <div className="border-l-3 border-accent-primary pl-4 py-1">
          <p className="text-base font-medium leading-relaxed text-text-primary">
            <InlineText text={tldr} />
          </p>
        </div>
      )}

      {/* Sections */}
      {sections.map((section, i) => (
        <div key={i}>
          {section.heading && (
            <h4 className="mb-2 text-sm font-bold text-text-primary">
              {section.heading}
            </h4>
          )}
          {section.content.map((line, j) => {
            // Bullet points
            if (line.startsWith("- ") || line.startsWith("• ")) {
              const bulletText = line.replace(/^[-•]\s*/, "");
              return (
                <div key={j} className="mb-1.5 ml-1 flex gap-2.5">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-primary/50" />
                  <p className="text-sm leading-relaxed text-text-secondary">
                    <InlineText text={bulletText} />
                  </p>
                </div>
              );
            }

            // Pull quote style for lines starting with >
            if (line.startsWith("> ")) {
              return (
                <blockquote key={j} className="my-3 border-l-2 border-border-primary pl-4 italic text-sm text-text-tertiary">
                  <InlineText text={line.slice(2)} />
                </blockquote>
              );
            }

            // Regular paragraph
            return (
              <p key={j} className="mb-2 text-sm leading-relaxed text-text-secondary">
                <InlineText text={line} />
              </p>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function TodaysBrief() {
  const { brief, isLoading, error, refresh } = useTodaysBrief();
  const [isExpanded, setIsExpanded] = useState(false);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (error && !brief && !isLoading) return null;

  // Extract a preview line from the brief
  const previewLine = brief
    ? (() => {
        const { tldr } = parseBrief(brief);
        if (tldr) return tldr;
        const firstLine = brief.split("\n").find((l) => l.trim() && !l.trim().startsWith("##") && !l.trim().startsWith("**"));
        return firstLine?.trim() || "";
      })()
    : "";

  return (
    <section className="rounded-2xl border border-border-secondary bg-bg-card shadow-sm overflow-hidden" style={{ borderLeft: "4px solid var(--accent-primary)" }}>
      {/* Header — clickable to expand/collapse */}
      <div
        className="flex items-center justify-between px-6 py-8 cursor-pointer hover:bg-bg-hover/50 transition-colors"
        onClick={() => brief && setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-text-primary">
              Today&apos;s Brief
            </h3>
            <span className="inline-flex items-center rounded-md bg-accent-primary/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-accent-primary">
              AI
            </span>
            <span className="text-xs text-text-tertiary">{today}</span>
          </div>
          {/* Preview — 2-3 sentences when collapsed */}
          {!isExpanded && previewLine && (
            <p className="mt-2 text-sm leading-relaxed text-text-secondary line-clamp-3">
              {previewLine.replace(/\*\*/g, "")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              refresh();
            }}
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
          {brief && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="rounded-lg p-1.5 text-text-tertiary hover:text-text-secondary transition-colors"
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Content — only when expanded */}
      {isExpanded && (
        <div className="border-t border-border-secondary px-6 py-5">
          {isLoading && !brief && (
            <div className="space-y-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-bg-secondary" />
              <div className="h-4 w-full animate-pulse rounded bg-bg-secondary" />
              <div className="h-4 w-11/12 animate-pulse rounded bg-bg-secondary" />
              <div className="mt-4 h-4 w-full animate-pulse rounded bg-bg-secondary" />
              <div className="h-4 w-9/12 animate-pulse rounded bg-bg-secondary" />
            </div>
          )}

          {brief && <BriefContent content={brief} />}
        </div>
      )}

      {/* Loading state when not expanded */}
      {!isExpanded && isLoading && !brief && (
        <div className="border-t border-border-secondary px-6 py-3">
          <div className="h-3 w-2/3 animate-pulse rounded bg-bg-secondary" />
        </div>
      )}
    </section>
  );
}
