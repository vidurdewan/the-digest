"use client";

import { useState } from "react";
import {
  Eye,
  Plus,
  X,
  Building2,
  User,
  Landmark,
  Hash,
} from "lucide-react";
import type { Article, Summary, WatchlistItem } from "@/types";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { useToastStore } from "@/components/ui/Toast";

interface WatchlistViewProps {
  watchlist: WatchlistItem[];
  articles: (Article & { summary?: Summary })[];
  onSave?: (id: string) => void;
  onOpenReader?: (article: Article & { summary?: Summary }) => void;
  onRequestSummary?: (
    article: Article & { summary?: Summary }
  ) => Promise<Summary | null>;
  onAddItem?: (name: string, type: WatchlistItem["type"]) => Promise<boolean>;
  onRemoveItem?: (id: string) => Promise<boolean>;
  onExpand?: (articleId: string) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  company: <Building2 size={14} />,
  fund: <Landmark size={14} />,
  person: <User size={14} />,
  keyword: <Hash size={14} />,
};

const typeLabels: Record<string, string> = {
  company: "Company",
  fund: "Fund",
  person: "Person",
  keyword: "Keyword",
};

export function WatchlistView({
  watchlist,
  articles,
  onSave,
  onOpenReader,
  onRequestSummary,
  onAddItem,
  onRemoveItem,
  onExpand,
}: WatchlistViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<WatchlistItem["type"]>("company");
  const { addToast } = useToastStore();

  const matchingArticles = articles.filter(
    (a) => a.watchlistMatches.length > 0
  );

  const handleAdd = async () => {
    if (!newName.trim()) return;
    if (onAddItem) {
      const success = await onAddItem(newName.trim(), newType);
      if (success) {
        addToast(`Added "${newName.trim()}" to watchlist`, "success");
        setNewName("");
        setShowAddForm(false);
      } else {
        addToast("Failed to add watchlist item", "error");
      }
    }
  };

  const handleRemove = async (id: string) => {
    const item = watchlist.find((w) => w.id === id);
    if (onRemoveItem) {
      const success = await onRemoveItem(id);
      if (success && item) {
        addToast(`Removed "${item.name}" from watchlist`, "info");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye size={24} className="text-accent-primary" />
          <div>
            <h2 className="text-2xl font-bold text-text-primary">
              Watchlist Alerts
            </h2>
            <p className="text-sm text-text-tertiary">
              {matchingArticles.length} article
              {matchingArticles.length !== 1 ? "s" : ""} match your{" "}
              {watchlist.length} watchlist item
              {watchlist.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 rounded-lg bg-accent-primary px-3 py-2 text-sm font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors"
        >
          <Plus size={16} />
          Add Item
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="rounded-xl border border-accent-primary/30 bg-bg-card p-4">
          <div className="flex flex-wrap gap-3">
            <select
              value={newType}
              onChange={(e) =>
                setNewType(e.target.value as WatchlistItem["type"])
              }
              className="rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
            >
              <option value="company">Company</option>
              <option value="fund">Fund</option>
              <option value="person">Person</option>
              <option value="keyword">Keyword</option>
            </select>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder={`Enter ${typeLabels[newType].toLowerCase()} name...`}
              className="flex-1 rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-accent-primary"
              autoFocus
            />
            <button
              onClick={handleAdd}
              className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="rounded-lg border border-border-primary px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Current watchlist items */}
      <div className="flex flex-wrap gap-2">
        {watchlist.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-2 rounded-full border border-border-primary bg-bg-card px-3 py-1.5 text-sm transition-colors hover:border-accent-danger/30"
          >
            <span className="text-text-tertiary">{typeIcons[item.type]}</span>
            <span className="text-text-primary">{item.name}</span>
            <button
              onClick={() => handleRemove(item.id)}
              className="rounded-full p-0.5 text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-accent-danger transition-all"
              aria-label={`Remove ${item.name}`}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {watchlist.length === 0 && (
          <p className="text-sm text-text-tertiary">
            No watchlist items yet. Add companies, funds, people, or keywords to
            track.
          </p>
        )}
      </div>

      {/* Matching articles */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
          Matching Articles
        </h3>
        {matchingArticles.length > 0 ? (
          matchingArticles.map((article) => (
            <div key={article.id}>
              {article.watchlistMatches.length > 0 && (
                <div className="mb-1 flex flex-wrap gap-1">
                  {article.watchlistMatches.map((match) => (
                    <span
                      key={match}
                      className="rounded-full bg-accent-warning/15 px-2 py-0.5 text-xs font-medium text-accent-warning"
                    >
                      {match}
                    </span>
                  ))}
                </div>
              )}
              <ArticleCard
                article={article}
                onSave={onSave}
                onOpenReader={onOpenReader}
                onRequestSummary={onRequestSummary}
                onExpand={onExpand}
              />
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-border-primary bg-bg-card p-8 text-center">
            <Eye size={32} className="mx-auto mb-3 text-text-tertiary" />
            <p className="text-text-secondary">
              No articles currently match your watchlist.
            </p>
            <p className="mt-1 text-sm text-text-tertiary">
              Articles mentioning your watched items will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
