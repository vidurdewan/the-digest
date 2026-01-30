"use client";

import { ExternalLink, Share2, FileText, Tag, ArrowRight, ScrollText } from "lucide-react";
import type { Summary, Entity, ArticleIntelligence, ArticleSignal } from "@/types";
import { SignalBadges } from "@/components/intelligence/SignalBadge";
import { AnnotationsPanel } from "./AnnotationsPanel";
import { QuickReactions } from "@/components/intelligence/QuickReactions";
import { GoDeeper } from "@/components/intelligence/GoDeeper";
import { RemindMeButton } from "@/components/intelligence/RemindMeButton";

interface ExpandedArticleViewProps {
  summary: Summary;
  onOpenFull?: (e: React.MouseEvent) => void;
  sourceUrl: string;
  articleId?: string;
  intelligence?: ArticleIntelligence;
  signals?: ArticleSignal[];
  articleTitle?: string;
  articleContent?: string;
}

export function ExpandedArticleView({
  summary,
  onOpenFull,
  sourceUrl,
  articleId,
  intelligence,
  signals,
  articleTitle,
  articleContent,
}: ExpandedArticleViewProps) {
  return (
    <div className="space-y-4 px-5 py-5 sm:px-6">
      {/* Signal badges */}
      {signals && signals.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <SignalBadges signals={signals} max={3} />
        </div>
      )}

      {/* The News */}
      <div>
        <h4 className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-text-primary">
          <span className="inline-block h-1 w-1 rounded-full bg-accent-primary" />
          The News
        </h4>
        <p className="text-sm leading-relaxed text-text-secondary">
          {summary.theNews}
        </p>
      </div>

      {/* Why It Matters */}
      <div className="rounded-xl bg-bg-secondary p-4">
        <h4 className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-text-primary">
          <span className="inline-block h-1 w-1 rounded-full bg-accent-warning" />
          Why It Matters
        </h4>
        <p className="text-sm leading-relaxed text-text-secondary">
          {summary.whyItMatters}
        </p>
      </div>

      {/* The Context */}
      {summary.theContext && (
        <div>
          <h4 className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <span className="inline-block h-1 w-1 rounded-full bg-accent-success" />
            The Context
          </h4>
          <p className="text-sm leading-relaxed text-text-secondary">
            {summary.theContext}
          </p>
        </div>
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

      {/* Quick Reactions + Remind Me */}
      {articleId && (
        <div className="flex items-center justify-between">
          <QuickReactions articleId={articleId} />
          <RemindMeButton articleId={articleId} />
        </div>
      )}

      {/* Go Deeper / Explain This */}
      {articleId && articleTitle && (
        <GoDeeper
          articleId={articleId}
          articleTitle={articleTitle}
          articleContent={articleContent}
        />
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
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-xl border border-border-secondary px-4 py-2 text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors"
        >
          <ExternalLink size={14} />
          Open Source
        </a>
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
