"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BookOpen,
  TrendingUp,
  Zap,
} from "lucide-react";
import { PatternCard, ThreadCard } from "./PatternCard";

interface WeeklySynthesisData {
  id?: string;
  weekStart: string;
  weekEnd: string;
  synthesis: string;
  threads: Array<{ title: string; summary: string; articleCount: number }>;
  patterns: string[];
  generatedAt: string;
}

export function WeeklySynthesisView() {
  const [synthesis, setSynthesis] = useState<WeeklySynthesisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch the latest synthesis on mount
  useEffect(() => {
    fetchSynthesis();
  }, []);

  const fetchSynthesis = async (week?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = week
        ? `/api/weekly-synthesis?week=${week}`
        : "/api/weekly-synthesis";
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setSynthesis(data.synthesis || null);
      }
    } catch {
      setError("Failed to load synthesis");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/weekly-synthesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setSynthesis(data.synthesis);
      }
    } catch {
      setError("Failed to generate synthesis");
    } finally {
      setIsGenerating(false);
    }
  };

  const navigateWeek = (direction: "prev" | "next") => {
    if (!synthesis) return;

    const current = new Date(synthesis.weekStart);
    const offset = direction === "prev" ? -7 : 7;
    const target = new Date(current.getTime() + offset * 24 * 60 * 60 * 1000);
    fetchSynthesis(target.toISOString().slice(0, 10));
  };

  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${s.toLocaleDateString("en-US", opts)} — ${e.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen size={24} className="text-accent-primary" />
          <div>
            <h2 className="text-2xl font-bold text-text-primary">
              Weekly Synthesis
            </h2>
            <p className="text-sm text-text-tertiary">
              Your AI intelligence briefing for the week
            </p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-1.5 rounded-lg bg-accent-primary px-3 py-2 text-sm font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={isGenerating ? "animate-spin" : ""}
          />
          {isGenerating ? "Generating..." : "Generate"}
        </button>
      </div>

      {/* Week navigation */}
      {synthesis && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigateWeek("prev")}
            className="rounded-md p-1.5 text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-accent-primary" />
            <span className="text-sm font-medium text-text-primary">
              {formatDateRange(synthesis.weekStart, synthesis.weekEnd)}
            </span>
          </div>
          <button
            onClick={() => navigateWeek("next")}
            className="rounded-md p-1.5 text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-accent-primary" />
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && !synthesis && (
        <div className="rounded-xl border border-border-primary bg-bg-card p-12 text-center">
          <BookOpen
            size={48}
            className="mx-auto mb-4 text-text-tertiary opacity-30"
          />
          <h3 className="text-lg font-semibold text-text-primary mb-1">
            No synthesis yet
          </h3>
          <p className="text-sm text-text-tertiary mb-4">
            Generate your first weekly intelligence synthesis to see threads and
            patterns.
          </p>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={isGenerating ? "animate-spin" : ""}
            />
            {isGenerating ? "Generating..." : "Generate Synthesis"}
          </button>
        </div>
      )}

      {/* Synthesis content */}
      {!isLoading && synthesis && (
        <div className="space-y-6">
          {/* Narrative synthesis */}
          <div className="rounded-xl border border-border-primary bg-bg-card p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-primary">
              <BookOpen size={14} className="text-accent-primary" />
              Intelligence Briefing
            </h3>
            <div className="prose prose-sm max-w-none text-text-secondary">
              {synthesis.synthesis.split("\n\n").map((para, i) => (
                <p key={i} className="mb-3 text-sm leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          </div>

          {/* Threads */}
          {synthesis.threads.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-primary">
                <Zap size={14} className="text-accent-primary" />
                This Week&apos;s Threads
                <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-xs font-medium text-accent-primary">
                  {synthesis.threads.length}
                </span>
              </h3>
              <div className="space-y-3">
                {synthesis.threads.map((thread, i) => (
                  <ThreadCard
                    key={i}
                    title={thread.title}
                    summary={thread.summary}
                    articleCount={thread.articleCount}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Patterns */}
          {synthesis.patterns.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-primary">
                <TrendingUp size={14} className="text-accent-warning" />
                Emerging Signals
                <span className="rounded-full bg-accent-warning/10 px-2 py-0.5 text-xs font-medium text-accent-warning">
                  {synthesis.patterns.length}
                </span>
              </h3>
              <div className="space-y-2">
                {synthesis.patterns.map((pattern, i) => (
                  <PatternCard key={i} pattern={pattern} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Generation metadata */}
          {synthesis.generatedAt && (
            <p className="text-center text-xs text-text-tertiary">
              Generated{" "}
              {new Date(synthesis.generatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
