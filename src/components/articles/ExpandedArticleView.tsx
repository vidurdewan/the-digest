"use client";

import { ExternalLink, Share2, FileText, Tag, ArrowRight } from "lucide-react";
import type { Summary, Entity, ArticleIntelligence } from "@/types";
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
  articleTitle?: string;
  articleContent?: string;
}

export function ExpandedArticleView({
  summary,
  onOpenFull,
  sourceUrl,
  articleId,
  intelligence,
  articleTitle,
  articleContent,
}: ExpandedArticleViewProps) {
  return (
    <div className="space-y-4 px-4 py-4 sm:px-5">
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
      <div className="rounded-lg bg-bg-secondary p-3">
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
        <div className="border-t border-border-secondary pt-3">
          <AnnotationsPanel articleId={articleId} />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border-secondary pt-3">
        <button
          onClick={onOpenFull}
          className="flex items-center gap-1.5 rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors"
        >
          <FileText size={14} />
          Read Full Article
        </button>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-border-primary px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors"
        >
          <ExternalLink size={14} />
          Open Source
        </a>
        <button className="flex items-center gap-1.5 rounded-lg border border-border-primary px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors">
          <Share2 size={14} />
          Share
        </button>
      </div>
    </div>
  );
}

function EntityTag({ entity }: { entity: Entity }) {
  const typeStyles: Record<string, { border: string; text: string }> = {
    company: { border: "#3b82f6", text: "#2563eb" },
    person: { border: "#8b5cf6", text: "#7c3aed" },
    fund: { border: "#10b981", text: "#059669" },
    keyword: { border: "#f59e0b", text: "#d97706" },
  };

  const style = typeStyles[entity.type] || typeStyles.keyword;

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
