"use client";

import { useState, useMemo } from "react";
import {
  Eye,
  Plus,
  X,
  Building2,
  User,
  Landmark,
  Hash,
  Sparkles,
} from "lucide-react";
import type { Article, Summary, WatchlistItem, TopicCategory } from "@/types";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { useToastStore } from "@/components/ui/Toast";
import { topicLabels } from "@/lib/mock-data";

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
  embedded?: boolean;
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

// Stop words to filter when extracting entities from titles
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "with", "by", "from", "as", "is", "was", "are", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
  "may", "might", "shall", "can", "not", "no", "its", "it", "this", "that",
  "these", "those", "new", "how", "why", "what", "who", "when", "where", "which",
  "after", "before", "into", "over", "up", "says", "said", "report", "reports",
  "more", "most", "than", "also", "about", "just", "out", "now", "all", "first",
  "last", "next", "back", "down", "off", "top", "set", "big", "get", "own",
]);

function extractSuggestedEntities(
  articles: (Article & { summary?: Summary })[],
  existingWatchlist: WatchlistItem[]
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  const existingNames = new Set(
    existingWatchlist.map((w) => w.name.toLowerCase())
  );

  // Primary: use keyEntities from summaries
  for (const article of articles) {
    if (article.summary?.keyEntities) {
      for (const entity of article.summary.keyEntities) {
        if (existingNames.has(entity.name.toLowerCase())) continue;
        if (entity.name.length < 2) continue;
        const key = entity.name;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  }

  // Fallback: extract proper noun sequences from titles
  if (counts.size < 5) {
    for (const article of articles) {
      const matches = article.title.match(
        /\b[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)+\b/g
      );
      if (matches) {
        for (const match of matches) {
          const words = match.split(/\s+/);
          if (words.every((w) => STOP_WORDS.has(w.toLowerCase()))) continue;
          if (existingNames.has(match.toLowerCase())) continue;
          if (!counts.has(match)) {
            counts.set(match, (counts.get(match) || 0) + 1);
          }
        }
      }
    }
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function getTopTopics(
  articles: (Article & { summary?: Summary })[]
): { topic: TopicCategory; label: string }[] {
  const topicCounts = new Map<TopicCategory, number>();
  for (const article of articles) {
    topicCounts.set(article.topic, (topicCounts.get(article.topic) || 0) + 1);
  }
  return Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => ({
      topic,
      label: topicLabels[topic] || topic,
    }));
}

export function WatchlistView({
  watchlist,
  articles,
  onSave,
  onOpenReader,
  onRequestSummary,
  onAddItem,
  onRemoveItem,
  onExpand,
  embedded,
}: WatchlistViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<WatchlistItem["type"]>("company");
  const { addToast } = useToastStore();

  const matchingArticles = articles.filter(
    (a) => a.watchlistMatches.length > 0
  );

  const suggestedEntities = useMemo(
    () => extractSuggestedEntities(articles, watchlist),
    [articles, watchlist]
  );

  const topTopics = useMemo(() => getTopTopics(articles), [articles]);

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

  const handleAddSuggested = async (name: string) => {
    if (onAddItem) {
      const success = await onAddItem(name, "company");
      if (success) {
        addToast(`Added "${name}" to watchlist`, "success");
      }
    }
  };

  return (
    <div className="space-y-6">
      {!embedded && (
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
      )}

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
          <div className="w-full rounded-2xl border border-border-secondary bg-bg-card p-12 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-secondary">
              <Eye size={28} className="text-text-tertiary opacity-50" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Track companies, topics, or keywords
            </h3>
            <p className="text-sm text-text-secondary max-w-sm mx-auto mb-5">
              Add items to your watchlist and matching articles will surface here automatically.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 rounded-full bg-accent-primary px-5 py-2.5 text-sm font-semibold text-text-inverse hover:bg-accent-primary-hover transition-colors"
            >
              <Plus size={16} />
              Add to Watchlist
            </button>
            {topTopics.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {topTopics.map(({ topic, label }) => (
                  <button
                    key={topic}
                    onClick={() => {
                      if (onAddItem) {
                        onAddItem(label, "keyword").then((ok) => {
                          if (ok) addToast(`Added "${label}" to watchlist`, "success");
                        });
                      }
                    }}
                    className="rounded-full border border-border-primary bg-bg-secondary px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-accent-primary/40 hover:text-accent-primary transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suggested section */}
      {suggestedEntities.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
              Suggested
            </h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {suggestedEntities.map((entity) => (
              <div
                key={entity.name}
                className="flex items-center justify-between rounded-xl border border-border-secondary bg-bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {entity.name}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    {entity.count} mention{entity.count !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={() => handleAddSuggested(entity.name)}
                  className="ml-3 shrink-0 rounded-lg border border-border-primary px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:border-accent-primary/40 hover:text-accent-primary transition-colors"
                >
                  <Plus size={12} className="inline -mt-0.5 mr-0.5" />
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <div className="rounded-2xl border border-border-secondary bg-bg-card p-12 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-secondary">
              <Eye size={28} className="text-text-tertiary opacity-50" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-1.5">
              No matches yet
            </h3>
            <p className="text-sm text-text-secondary max-w-xs mx-auto mb-1">
              Articles mentioning your watched items will surface here automatically.
            </p>
            <p className="text-xs text-text-tertiary max-w-xs mx-auto">
              Try adding companies like &ldquo;OpenAI&rdquo; or people like &ldquo;Sam Altman&rdquo; to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
