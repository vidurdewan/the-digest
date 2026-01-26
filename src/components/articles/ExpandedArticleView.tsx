"use client";

import { ExternalLink, Share2, FileText, Tag } from "lucide-react";
import type { Summary, Entity } from "@/types";
import { AnnotationsPanel } from "./AnnotationsPanel";

interface ExpandedArticleViewProps {
  summary: Summary;
  onOpenFull?: (e: React.MouseEvent) => void;
  sourceUrl: string;
  articleId?: string;
}

export function ExpandedArticleView({
  summary,
  onOpenFull,
  sourceUrl,
  articleId,
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
