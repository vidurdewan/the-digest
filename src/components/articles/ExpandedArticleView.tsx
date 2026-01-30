"use client";

import { useState, useRef, useEffect } from "react";
import { ExternalLink, Share2, FileText, Tag, ArrowRight, ScrollText, Bookmark, Search, X, MoreHorizontal, Check, Lightbulb, Sparkles, Unlink, ThumbsDown, Bell, HelpCircle } from "lucide-react";
import type { Summary, Entity, ArticleIntelligence, ArticleSignal } from "@/types";
import type { RelatedItem } from "@/lib/cross-references";
import { SignalBadges } from "@/components/intelligence/SignalBadge";
import { AnnotationsPanel } from "./AnnotationsPanel";
import { GoDeeper } from "@/components/intelligence/GoDeeper";
import { ScannableSection, CalloutBlock, KeyQuotePullquote, SourceExcerptBlock } from "@/components/ui/ScannableText";

interface ExpandedArticleViewProps {
  summary: Summary;
  onOpenFull?: (e: React.MouseEvent) => void;
  onOpenSource?: () => void;
  sourceUrl: string;
  articleId?: string;
  intelligence?: ArticleIntelligence;
  signals?: ArticleSignal[];
  articleTitle?: string;
  articleContent?: string;
  onSave?: () => void;
  onDismiss?: () => void;
  isSaved?: boolean;
  relatedContent?: RelatedItem[];
  onNavigateToArticle?: (id: string) => void;
  onOpenNewsletter?: (id: string) => void;
  sourceName?: string;
}

export function ExpandedArticleView({
  summary,
  onOpenFull,
  onOpenSource,
  sourceUrl,
  articleId,
  intelligence,
  signals,
  articleTitle,
  articleContent,
  onSave,
  onDismiss,
  isSaved,
  relatedContent,
  onNavigateToArticle,
  onOpenNewsletter,
  sourceName,
}: ExpandedArticleViewProps) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [showExcerpt, setShowExcerpt] = useState<Record<string, boolean>>({});
  const overflowRef = useRef<HTMLDivElement>(null);

  // Extract key quotes from summary text (text in quotation marks with attribution)
  const keyQuotes = (() => {
    const allText = [summary.theNews, summary.whyItMatters, summary.theContext].filter(Boolean).join(" ");
    const quoteMatches = allText.match(/[""\u201C]([^""\u201D]{15,}?)[""\u201D]\s*(?:[-–—]\s*(.+?)(?:[,.]|$))?/g);
    if (!quoteMatches) return [];
    return quoteMatches.slice(0, 2).map((m) => {
      const parsed = m.match(/[""\u201C](.+?)[""\u201D]\s*(?:[-–—]\s*(.+?))?$/);
      return { quote: parsed?.[1] ?? m, attribution: parsed?.[2]?.trim() };
    });
  })();

  // Extract a source excerpt from the original article content
  const getExcerpt = (sectionText: string): string | null => {
    if (!articleContent) return null;
    // Find a sentence from the original that overlaps with the summary section
    const words = sectionText.split(/\s+/).slice(0, 5).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, "")).filter(w => w.length > 3);
    if (words.length === 0) return null;
    const contentLower = articleContent.toLowerCase();
    // Look for a sentence containing at least 2 of the first 5 significant words
    const sentences = articleContent.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      const sentLower = sentence.toLowerCase();
      const matchCount = words.filter(w => sentLower.includes(w)).length;
      if (matchCount >= 2 && sentence.length > 30 && sentence.length < 400) {
        return sentence.trim();
      }
    }
    return null;
  };

  // Close overflow on outside click
  useEffect(() => {
    if (!overflowOpen) return;
    function handleClick(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [overflowOpen]);

  return (
    <div className="space-y-4 px-5 py-5 sm:px-6">
      {/* Signal badges */}
      {signals && signals.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <SignalBadges signals={signals} max={3} />
        </div>
      )}

      {/* The News */}
      {summary.theNews && (
        <div>
          <ScannableSection label="The News" text={summary.theNews} tier="primary" />
          {articleContent && (() => {
            const excerpt = getExcerpt(summary.theNews);
            if (!excerpt) return null;
            return (
              <>
                <button
                  onClick={() => setShowExcerpt(p => ({ ...p, theNews: !p.theNews }))}
                  className="mt-1 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  {showExcerpt.theNews ? "Hide source excerpt" : "Show source excerpt"}
                </button>
                {showExcerpt.theNews && (
                  <SourceExcerptBlock sourceName={sourceName ?? "Source"} excerpt={excerpt} />
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Key Quotes */}
      {keyQuotes.length > 0 && keyQuotes.map((kq, i) => (
        <KeyQuotePullquote key={i} quote={kq.quote} attribution={kq.attribution} />
      ))}

      {/* Why It Matters */}
      {summary.whyItMatters && (
        <div>
          <ScannableSection label="Why It Matters" text={summary.whyItMatters} tier="secondary" />
          {articleContent && (() => {
            const excerpt = getExcerpt(summary.whyItMatters);
            if (!excerpt) return null;
            return (
              <>
                <button
                  onClick={() => setShowExcerpt(p => ({ ...p, whyItMatters: !p.whyItMatters }))}
                  className="mt-1 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  {showExcerpt.whyItMatters ? "Hide source excerpt" : "Show source excerpt"}
                </button>
                {showExcerpt.whyItMatters && (
                  <SourceExcerptBlock sourceName={sourceName ?? "Source"} excerpt={excerpt} />
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* The Context */}
      {summary.theContext && (
        <div>
          <ScannableSection label="The Context" text={summary.theContext} tier="secondary" />
          {articleContent && (() => {
            const excerpt = getExcerpt(summary.theContext);
            if (!excerpt) return null;
            return (
              <>
                <button
                  onClick={() => setShowExcerpt(p => ({ ...p, theContext: !p.theContext }))}
                  className="mt-1 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  {showExcerpt.theContext ? "Hide source excerpt" : "Show source excerpt"}
                </button>
                {showExcerpt.theContext && (
                  <SourceExcerptBlock sourceName={sourceName ?? "Source"} excerpt={excerpt} />
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* So What (if present on newsletter summaries passed through) */}
      {"soWhat" in summary && typeof (summary as { soWhat?: string }).soWhat === "string" && (
        <CalloutBlock label="So What" text={(summary as { soWhat: string }).soWhat} />
      )}

      {/* Deciphering — Primary document analysis */}
      {summary.deciphering && (
        <div className="rounded-xl border border-border-secondary bg-bg-secondary/30 p-4 space-y-3">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-primary">
            <ScrollText size={14} />
            Deciphering the Filing
          </h4>
          {summary.deciphering.theFiling && (
            <div>
              <span className="text-xs font-semibold text-text-primary">The Filing</span>
              <p className="text-sm leading-relaxed text-text-secondary">{summary.deciphering.theFiling}</p>
            </div>
          )}
          {summary.deciphering.whatChanged && (
            <div>
              <span className="text-xs font-semibold text-text-primary">What Changed</span>
              <p className="text-sm leading-relaxed text-text-secondary">{summary.deciphering.whatChanged}</p>
            </div>
          )}
          {summary.deciphering.whatsBuried && (
            <div>
              <span className="text-xs font-semibold text-text-primary">What&apos;s Buried</span>
              <p className="text-sm leading-relaxed text-text-secondary">{summary.deciphering.whatsBuried}</p>
            </div>
          )}
          {summary.deciphering.whatTheJargonMeans && (
            <div>
              <span className="text-xs font-semibold text-text-primary">What the Jargon Means</span>
              <p className="text-sm leading-relaxed text-text-secondary">{summary.deciphering.whatTheJargonMeans}</p>
            </div>
          )}
          {summary.deciphering.theRealStory && (
            <div>
              <span className="text-xs font-semibold text-text-primary">The Real Story</span>
              <p className="text-sm leading-relaxed text-text-secondary">{summary.deciphering.theRealStory}</p>
            </div>
          )}
          {summary.deciphering.watchNext && (
            <div>
              <span className="text-xs font-semibold text-text-primary">Watch Next</span>
              <p className="text-sm leading-relaxed text-text-secondary">{summary.deciphering.watchNext}</p>
            </div>
          )}
        </div>
      )}

      {/* Related Coverage */}
      {relatedContent && relatedContent.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            🔗 Related Coverage
          </h4>
          <div className="space-y-1">
            {relatedContent.map((item) => {
              const icon = item.type === "newsletter" ? "📧" : item.type === "primary" ? "📄" : "📰";
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.type === "newsletter") {
                      onOpenNewsletter?.(item.id);
                    } else if (item.type === "primary" && item.sourceUrl) {
                      window.open(item.sourceUrl, "_blank", "noopener,noreferrer");
                    } else {
                      onNavigateToArticle?.(item.id);
                    }
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  <span className="shrink-0">{icon}</span>
                  <span className="font-medium text-text-primary shrink-0">{item.source}:</span>
                  <span className="truncate">{item.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Key Entities */}
      {summary.keyEntities.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            <Tag size={12} />
            Key Entities
          </h4>
          <div className="flex flex-wrap gap-2">
            {summary.keyEntities.map((entity, i) => (
              <EntityTag key={i} entity={entity} />
            ))}
          </div>
        </div>
      )}

      {/* Watch for next */}
      {intelligence?.watchForNext && (
        <div className="flex items-start gap-2 rounded-lg border border-border-secondary bg-bg-secondary/50 px-3 py-2">
          <ArrowRight size={14} className="mt-0.5 shrink-0 text-accent-primary" />
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-accent-primary">
              Watch for next
            </span>
            <p className="text-sm text-text-secondary">
              {intelligence.watchForNext}
            </p>
          </div>
        </div>
      )}

      {/* Connections */}
      {intelligence?.connectsTo && intelligence.connectsTo.length > 0 && (
        <div className="rounded-lg border border-border-secondary bg-bg-secondary/30 px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            This connects to...
          </span>
          <div className="mt-1 space-y-1">
            {intelligence.connectsTo.map((conn, i) => (
              <p key={i} className="text-sm text-text-secondary">
                <span className="font-medium text-text-primary">{conn.articleTitle}</span>
                {" — "}{conn.reason}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ── Primary + Overflow Actions ── */}
      {articleId && (
        <div className="flex items-center gap-2">
          {/* Save */}
          <button
            onClick={(e) => { e.stopPropagation(); onSave?.(); }}
            className={`p-2 rounded-md transition-colors ${isSaved ? "text-accent-primary" : "text-text-tertiary hover:text-text-primary hover:bg-bg-secondary"}`}
            title={isSaved ? "Saved" : "Save"}
          >
            <Bookmark size={16} className={isSaved ? "fill-current" : ""} />
          </button>

          {/* Go Deeper (icon-only trigger; full component rendered below) */}
          {articleTitle && (
            <GoDeeper
              articleId={articleId}
              articleTitle={articleTitle}
              articleContent={articleContent}
            />
          )}

          {/* Dismiss */}
          {onDismiss && (
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(); }}
              className="p-2 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          )}

          {/* Overflow menu */}
          <div className="relative" ref={overflowRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setOverflowOpen(!overflowOpen); }}
              className="p-2 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
              title="More actions"
            >
              <MoreHorizontal size={16} />
            </button>
            {overflowOpen && (
              <div className="absolute bottom-full left-0 z-30 mb-1 w-44 rounded-lg border border-border-primary bg-bg-card py-1 shadow-lg">
                {[
                  { label: "Already knew", icon: Check },
                  { label: "Useful", icon: Lightbulb },
                  { label: "Surprising", icon: Sparkles },
                  { label: "Bad connection", icon: Unlink },
                  { label: "Not important", icon: ThumbsDown },
                  { label: "Remind me", icon: Bell },
                  { label: "Explain this", icon: HelpCircle },
                ].map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    onClick={(e) => { e.stopPropagation(); setOverflowOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover transition-colors"
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Annotations */}
      {articleId && (
        <div className="border-t border-border-secondary pt-4">
          <AnnotationsPanel articleId={articleId} />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border-secondary pt-4">
        <button
          onClick={onOpenFull}
          className="flex items-center gap-1.5 rounded-xl bg-accent-primary px-4 py-2 text-xs font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors"
        >
          <FileText size={14} />
          Read Full Article
        </button>
        <button className="flex items-center gap-1.5 rounded-xl border border-border-secondary px-4 py-2 text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors">
          <Share2 size={14} />
          Share
        </button>
      </div>
    </div>
  );
}

function EntityTag({ entity }: { entity: Entity }) {
  const entityKey = (["company", "person", "fund", "keyword"].includes(entity.type) ? entity.type : "keyword");
  const style = {
    border: `var(--entity-${entityKey}-border)`,
    text: `var(--entity-${entityKey}-text)`,
  };

  return (
    <button
      className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80"
      style={{ borderColor: style.border, color: style.text }}
    >
      <span className="text-[10px] uppercase opacity-60">{entity.type}</span>
      <span>{entity.name}</span>
    </button>
  );
}
