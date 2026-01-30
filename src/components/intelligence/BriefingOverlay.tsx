"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Zap, Mail } from "lucide-react";
import { topicLabels, topicDotColors } from "@/lib/mock-data";
import type { Article, Summary } from "@/types";

interface BriefingOverlayProps {
  articles: (Article & { summary?: Summary })[];
  onExit: () => void;
  onOpenFeed: () => void;
  onOpenNewsletters: () => void;
}

export function BriefingOverlay({
  articles,
  onExit,
  onOpenFeed,
  onOpenNewsletters,
}: BriefingOverlayProps) {
  // Top 8 articles by rankingScore
  const briefingArticles = articles
    .filter((a) => a.summary)
    .sort((a, b) => (b.rankingScore ?? 0) - (a.rankingScore ?? 0))
    .slice(0, 8);

  const totalCards = briefingArticles.length + 2; // intro + articles + completion
  const [currentIndex, setCurrentIndex] = useState(0);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, totalCards - 1));
  }, [totalCards]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Keyboard navigation within briefing
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onExit();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onExit, goNext, goPrev]);

  const progress = ((currentIndex + 1) / totalCards) * 100;
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="briefing-overlay">
      {/* Progress bar */}
      <div className="briefing-progress-bar" style={{ width: `${progress}%` }} />

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
        <div className="text-xs text-text-tertiary">
          {currentIndex === 0
            ? "Introduction"
            : currentIndex <= briefingArticles.length
              ? `${currentIndex} of ${briefingArticles.length} stories`
              : "Complete"}
        </div>
        <button
          onClick={onExit}
          className="p-1.5 text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Exit briefing"
        >
          <X size={18} />
        </button>
      </div>

      {/* Card content */}
      <div className="flex-1 overflow-y-auto flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-2xl animate-fade-in" key={currentIndex}>
          {currentIndex === 0 ? (
            // Intro card
            <div className="text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border-primary text-xs text-text-tertiary uppercase tracking-wider">
                <Zap size={14} className="text-accent-primary" />
                Daily Brief
              </div>
              <h1 className="font-serif text-4xl font-bold text-text-primary leading-tight">
                Your Daily Brief
              </h1>
              <p className="text-lg text-text-secondary">
                {today}
              </p>
              <p className="text-text-secondary">
                {briefingArticles.length} stories curated for you
              </p>
              <button
                onClick={goNext}
                className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent-primary text-white font-medium text-sm hover:opacity-90 transition-opacity"
              >
                Start reading <ChevronRight size={16} />
              </button>
            </div>
          ) : currentIndex <= briefingArticles.length ? (
            // Article card
            (() => {
              const article = briefingArticles[currentIndex - 1];
              const summary = article.summary!;
              return (
                <div className="space-y-6">
                  {/* Topic pill */}
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: topicDotColors[article.topic] }}
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      {topicLabels[article.topic]}
                    </span>
                    <span className="text-xs text-text-tertiary">·</span>
                    <span className="text-xs text-text-tertiary">{article.source}</span>
                  </div>

                  {/* Headline */}
                  <h2 className="font-serif text-3xl font-bold text-text-primary leading-snug">
                    {article.title}
                  </h2>

                  {/* The News */}
                  <div>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">
                      🔴 The News
                    </h3>
                    <p className="text-[16px] leading-[1.8] text-text-primary">
                      {summary.theNews}
                    </p>
                  </div>

                  {/* Why It Matters */}
                  <div>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">
                      💡 Why It Matters
                    </h3>
                    <p className="text-[16px] leading-[1.8] text-text-secondary">
                      {summary.whyItMatters}
                    </p>
                  </div>

                  {/* So What callout */}
                  {summary.theContext && (
                    <div className="border-l-[3px] border-accent-primary bg-bg-secondary p-4 mt-4">
                      <p className="text-[11px] uppercase tracking-wider font-bold mb-1" style={{ color: "var(--accent-primary)" }}>
                        So What
                      </p>
                      <p className="font-serif text-[16px] italic leading-[1.6] text-text-primary">
                        {summary.theContext}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            // Completion card
            <div className="text-center space-y-6">
              <div className="text-5xl">✓</div>
              <h2 className="font-serif text-3xl font-bold text-text-primary">
                You&apos;re briefed.
              </h2>
              <p className="text-text-secondary">
                You&apos;ve reviewed {briefingArticles.length} stories. Stay sharp.
              </p>
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => { onExit(); onOpenFeed(); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border-primary text-sm font-medium text-text-primary hover:bg-bg-secondary transition-colors"
                >
                  <Zap size={14} />
                  See full feed
                </button>
                <button
                  onClick={() => { onExit(); onOpenNewsletters(); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border-primary text-sm font-medium text-text-primary hover:bg-bg-secondary transition-colors"
                >
                  <Mail size={14} />
                  Open newsletters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-border-primary">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
          Previous
        </button>
        <div className="flex gap-1.5">
          {Array.from({ length: totalCards }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === currentIndex ? "bg-accent-primary" : "bg-border-primary"
              }`}
            />
          ))}
        </div>
        <button
          onClick={goNext}
          disabled={currentIndex === totalCards - 1}
          className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
