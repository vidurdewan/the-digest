"use client";

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
      <div>
        <h2 className="font-serif text-2xl font-bold text-text-primary">
          Saved Articles
        </h2>
        <p className="text-sm text-text-tertiary mt-1">
          {savedArticles.length} article{savedArticles.length !== 1 ? "s" : ""}{" "}
          in your reading queue
        </p>
      </div>

      {savedArticles.length > 0 ? (
        <div className="divide-y divide-border-secondary">
          {savedArticles.map((article) => (
            <div key={article.id} className="py-3 first:pt-0 last:pb-0">
              <ArticleCard
                article={article}
                onSave={onSave}
                onOpenReader={onOpenReader}
                onRequestSummary={onRequestSummary}
                onExpand={onExpand}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
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
