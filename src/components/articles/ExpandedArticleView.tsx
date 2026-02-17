"use client";

import { useState } from "react";
import { Share2, ScrollText, Bookmark, X } from "lucide-react";
import type { Summary, ArticleIntelligence, ArticleSignal } from "@/types";
import type { RelatedItem } from "@/lib/cross-references";
import { SignalBadges } from "@/components/intelligence/SignalBadge";
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
  sourceUrl,
  articleId,
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
  const [showExcerpt, setShowExcerpt] = useState<Record<string, boolean>>({});

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

      {/* ── Action Bar ── */}
      {articleId && (
        <div className="flex items-center gap-1 border-t border-border-primary pt-4">
          <button
            onClick={(e) => { e.stopPropagation(); onSave?.(); }}
            className={`p-2 rounded-md transition-colors ${isSaved ? "text-accent-primary" : "text-text-tertiary hover:text-text-primary hover:bg-bg-secondary"}`}
            title={isSaved ? "Saved" : "Save"}
          >
            <Bookmark size={16} className={isSaved ? "fill-current" : ""} />
          </button>
          <button
            onClick={() => { if (navigator.share) { navigator.share({ title: articleTitle, url: sourceUrl }); } else { navigator.clipboard.writeText(sourceUrl); } }}
            className="p-2 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
            title="Share"
          >
            <Share2 size={16} />
          </button>
          {onDismiss && (
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(); }}
              className="p-2 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
