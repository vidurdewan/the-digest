"use client";

import { TrendingUp, Zap } from "lucide-react";

interface PatternCardProps {
  pattern: string;
  index: number;
  variant?: "thread" | "signal";
}

export function PatternCard({ pattern, index, variant = "signal" }: PatternCardProps) {
  const isThread = variant === "thread";

  return (
    <div
      style={{ animationDelay: `${index * 30}ms` }}
      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
        isThread
          ? "border-accent-primary/20 bg-accent-primary/5 hover:border-accent-primary/30"
          : "border-border-secondary bg-bg-secondary/50 hover:border-border-primary"
      }`}
    >
      <div
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          isThread
            ? "bg-accent-primary text-text-inverse"
            : "bg-bg-secondary text-text-tertiary"
        }`}
      >
        {isThread ? <Zap size={10} /> : <TrendingUp size={10} />}
      </div>
      <p className="text-sm leading-relaxed text-text-secondary">{pattern}</p>
    </div>
  );
}

interface ThreadCardProps {
  title: string;
  summary: string;
  articleCount: number;
}

export function ThreadCard({ title, summary, articleCount }: ThreadCardProps) {
  return (
    <div className="rounded-lg border border-accent-primary/20 bg-bg-card p-4 transition-colors hover:border-accent-primary/30">
      <div className="mb-1.5 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
        <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] font-medium text-accent-primary">
          {articleCount} article{articleCount !== 1 ? "s" : ""}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-text-secondary">{summary}</p>
    </div>
  );
}
