"use client";

import { useState } from "react";
import { Search, HelpCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface GoDeeperProps {
  articleId: string;
  articleTitle: string;
  articleContent?: string;
}

export function GoDeeper({ articleId, articleTitle, articleContent }: GoDeeperProps) {
  const [deeperContent, setDeeperContent] = useState<string | null>(null);
  const [explainContent, setExplainContent] = useState<string | null>(null);
  const [isLoadingDeeper, setIsLoadingDeeper] = useState(false);
  const [isLoadingExplain, setIsLoadingExplain] = useState(false);
  const [showDeeper, setShowDeeper] = useState(false);
  const [showExplain, setShowExplain] = useState(false);

  const handleGoDeeper = async () => {
    if (deeperContent) {
      setShowDeeper(!showDeeper);
      return;
    }

    setIsLoadingDeeper(true);
    setShowDeeper(true);
    try {
      const res = await fetch("/api/intelligence/go-deeper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          title: articleTitle,
          content: articleContent || "",
        }),
      });
      const data = await res.json();
      if (data.analysis) {
        setDeeperContent(data.analysis);
      }
    } catch {
      setDeeperContent("Unable to generate deeper analysis at this time.");
    } finally {
      setIsLoadingDeeper(false);
    }
  };

  const handleExplainThis = async () => {
    if (explainContent) {
      setShowExplain(!showExplain);
      return;
    }

    setIsLoadingExplain(true);
    setShowExplain(true);
    try {
      const res = await fetch("/api/intelligence/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          title: articleTitle,
          content: articleContent || "",
        }),
      });
      const data = await res.json();
      if (data.explanation) {
        setExplainContent(data.explanation);
      }
    } catch {
      setExplainContent("Unable to generate explanation at this time.");
    } finally {
      setIsLoadingExplain(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleGoDeeper}
          disabled={isLoadingDeeper}
          className="flex items-center gap-1.5 rounded-lg border border-accent-primary/30 px-3 py-1.5 text-xs font-medium text-accent-primary hover:bg-accent-primary/5 transition-colors disabled:opacity-50"
        >
          {isLoadingDeeper ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Search size={12} />
          )}
          Go deeper
          {deeperContent && (showDeeper ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
        </button>

        <button
          onClick={handleExplainThis}
          disabled={isLoadingExplain}
          className="flex items-center gap-1.5 rounded-lg border border-border-primary px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors disabled:opacity-50"
        >
          {isLoadingExplain ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <HelpCircle size={12} />
          )}
          Explain this
          {explainContent && (showExplain ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
        </button>
      </div>

      {/* Deeper analysis content */}
      {showDeeper && deeperContent && (
        <div className="rounded-lg border border-accent-primary/20 bg-accent-primary/5 p-3">
          <h5 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-accent-primary">
            Deeper Analysis
          </h5>
          <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-line">
            {deeperContent}
          </p>
        </div>
      )}

      {/* Explain this content */}
      {showExplain && explainContent && (
        <div className="rounded-lg border border-border-secondary bg-bg-secondary p-3">
          <h5 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            Simplified Explanation
          </h5>
          <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-line">
            {explainContent}
          </p>
        </div>
      )}
    </div>
  );
}
