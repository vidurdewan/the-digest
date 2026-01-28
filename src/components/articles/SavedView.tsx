"use client";

import { Bookmark } from "lucide-react";
import type { Article, Summary } from "@/types";
import { ArticleCard } from "./ArticleCard";
import { useSidebarStore } from "@/lib/store";

interface SavedViewProps {
  articles: (Article & { summary?: Summary })[];
  onSave?: (id: string) => void;
  onOpenReader?: (article: Article & { summary?: Summary }) => void;
  onRequestSummary?: (
    article: Article & { summary?: Summary }
  ) => Promise<Summary | null>;
  onExpand?: (articleId: string) => void;
}

export function SavedView({ articles, onSave, onOpenReader, onRequestSummary, onExpand }: SavedViewProps) {
  const savedArticles = articles.filter((a) => a.isSaved);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bookmark size={24} className="text-accent-primary" />
        <div>
          <h2 className="text-2xl font-bold text-text-primary">
            Saved Articles
          </h2>
          <p className="text-sm text-text-tertiary">
            {savedArticles.length} article{savedArticles.length !== 1 ? "s" : ""}{" "}
            in your reading queue
          </p>
        </div>
      </div>

      {savedArticles.length > 0 ? (
        <div className="space-y-3">
          {savedArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onSave={onSave}
              onOpenReader={onOpenReader}
              onRequestSummary={onRequestSummary}
              onExpand={onExpand}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border-secondary bg-bg-card p-12 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-secondary">
            <Bookmark size={28} className="text-text-tertiary opacity-50" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-1.5">
            No saved articles yet
          </h3>
          <p className="text-sm text-text-secondary max-w-xs mx-auto mb-1">
            Bookmark articles from your feed to build a personal reading queue.
          </p>
          <p className="text-xs text-text-tertiary max-w-xs mx-auto mb-5">
            Press{" "}
            <kbd className="rounded border border-border-primary bg-bg-secondary px-1 py-0.5 text-[10px] font-mono">
              S
            </kbd>{" "}
            on any focused article, or click the bookmark icon.
          </p>
          <button
            onClick={() => useSidebarStore.getState().setActiveSection("priority-feed")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors"
          >
            Browse your feed
          </button>
        </div>
      )}
    </div>
  );
}
