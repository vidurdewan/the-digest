"use client";

import { Bookmark } from "lucide-react";
import type { Article, Summary } from "@/types";
import { ArticleCard } from "./ArticleCard";

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
        <div className="rounded-xl border border-border-primary bg-bg-card p-8 text-center">
          <Bookmark size={32} className="mx-auto mb-3 text-text-tertiary" />
          <p className="text-text-secondary">No saved articles yet.</p>
          <p className="mt-1 text-sm text-text-tertiary">
            Click the bookmark icon on any article to save it for later.
          </p>
        </div>
      )}
    </div>
  );
}
