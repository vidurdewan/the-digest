"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  Calendar,
  Tag,
} from "lucide-react";
import { useOverlayStore } from "@/lib/store";
import { topicLabels } from "@/lib/mock-data";
import { ArticleCard } from "@/components/articles/ArticleCard";
import type { Article, Summary, TopicCategory, ArticleIntelligence } from "@/types";

const STORY_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  breaking: { label: "Breaking", color: "text-red-600" },
  developing: { label: "Developing", color: "text-orange-600" },
  analysis: { label: "Analysis", color: "text-blue-600" },
  opinion: { label: "Opinion", color: "text-purple-600" },
  feature: { label: "Feature", color: "text-green-600" },
  update: { label: "Update", color: "text-gray-500" },
};

interface SearchOverlayProps {
  articles: (Article & { summary?: Summary; intelligence?: ArticleIntelligence })[];
  onSave?: (id: string) => void;
  onOpenReader?: (article: Article & { summary?: Summary }) => void;
  onRequestSummary?: (
    article: Article & { summary?: Summary }
  ) => Promise<Summary | null>;
  onExpand?: (articleId: string) => void;
}

export function SearchOverlay({
  articles,
  onSave,
  onOpenReader,
  onRequestSummary,
  onExpand,
}: SearchOverlayProps) {
  const { searchOverlayOpen, closeSearchOverlay } = useOverlayStore();
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<TopicCategory | "all">("all");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all">("all");
  const [specificDate, setSpecificDate] = useState("");
  const [referenceTime] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (!searchOverlayOpen) return;

    const timer = setTimeout(() => {
      setQuery("");
      setShowFilters(false);
      setSelectedTopic("all");
      setDateRange("all");
      setSpecificDate("");
      inputRef.current?.focus();
    }, 10);

    return () => clearTimeout(timer);
  }, [searchOverlayOpen]);

  // Esc to close
  useEffect(() => {
    if (!searchOverlayOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeSearchOverlay();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchOverlayOpen, closeSearchOverlay]);

  const filteredArticles = useMemo(() => {
    let results = articles;

    if (query.trim()) {
      const q = query.toLowerCase();
      results = results.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.source.toLowerCase().includes(q) ||
          a.summary?.brief.toLowerCase().includes(q) ||
          a.summary?.theNews.toLowerCase().includes(q) ||
          a.content?.toLowerCase().includes(q) ||
          a.author?.toLowerCase().includes(q) ||
          a.summary?.keyEntities.some((e) => e.name.toLowerCase().includes(q))
      );
    }

    if (selectedTopic !== "all") {
      results = results.filter((a) => a.topic === selectedTopic);
    }

    if (specificDate) {
      results = results.filter((a) => {
        const articleDate = new Date(a.publishedAt).toISOString().slice(0, 10);
        return articleDate === specificDate;
      });
    } else if (dateRange !== "all") {
      const now = referenceTime;
      const cutoffs: Record<string, number> = {
        today: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
      };
      const cutoff = cutoffs[dateRange];
      if (cutoff) {
        results = results.filter(
          (a) => now - new Date(a.publishedAt).getTime() < cutoff
        );
      }
    }

    return results;
  }, [articles, query, selectedTopic, dateRange, specificDate, referenceTime]);

  const handleClearDate = useCallback(() => {
    setSpecificDate("");
    setDateRange("all");
  }, []);

  const hasActiveFilters =
    query || selectedTopic !== "all" || dateRange !== "all" || specificDate;

  if (!searchOverlayOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/50 backdrop-blur-sm reading-pane-backdrop"
      onClick={closeSearchOverlay}
    >
      <div
        className="mt-12 w-full max-w-2xl rounded-xl border border-border-primary bg-bg-elevated shadow-lg overlay-enter overflow-hidden flex flex-col"
        style={{ maxHeight: "calc(100vh - 6rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input bar */}
        <div className="flex items-center gap-3 border-b border-border-secondary px-4 py-3">
          <Search size={18} className="shrink-0 text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles, topics, companies, people..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-tertiary outline-none"
          />
          <div className="flex items-center gap-1">
            {query && (
              <button
                onClick={() => setQuery("")}
                className="rounded-md p-1.5 text-text-tertiary hover:text-text-primary"
              >
                <X size={14} />
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`rounded-md p-1.5 transition-colors ${
                showFilters
                  ? "bg-accent-primary text-text-inverse"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>
          <kbd className="hidden sm:inline-flex rounded border border-border-primary bg-bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-text-tertiary">
            Esc
          </kbd>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 border-b border-border-secondary bg-bg-secondary p-4">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-tertiary">
                <Tag size={10} />
                Topic
              </label>
              <select
                value={selectedTopic}
                onChange={(e) =>
                  setSelectedTopic(e.target.value as TopicCategory | "all")
                }
                className="rounded-lg border border-border-primary bg-bg-card px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary"
              >
                <option value="all">All Topics</option>
                {Object.entries(topicLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-tertiary">
                <Calendar size={10} />
                Date Range
              </label>
              <select
                value={specificDate ? "specific" : dateRange}
                onChange={(e) => {
                  if (e.target.value === "specific") return;
                  setSpecificDate("");
                  setDateRange(
                    e.target.value as "today" | "week" | "month" | "all"
                  );
                }}
                className="rounded-lg border border-border-primary bg-bg-card px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary"
              >
                <option value="all">Any Time</option>
                <option value="today">Today</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                {specificDate && (
                  <option value="specific">Specific Date</option>
                )}
              </select>
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-tertiary">
                <Calendar size={10} />
                Specific Date
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => {
                    setSpecificDate(e.target.value);
                    if (e.target.value) setDateRange("all");
                  }}
                  className="rounded-lg border border-border-primary bg-bg-card px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary"
                />
                {specificDate && (
                  <button
                    onClick={handleClearDate}
                    className="rounded-md p-1 text-text-tertiary hover:text-text-primary"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {hasActiveFilters ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-tertiary">
                  {filteredArticles.length} result
                  {filteredArticles.length !== 1 ? "s" : ""}
                  {query && (
                    <>
                      {" "}
                      for &ldquo;
                      <span className="text-text-primary">{query}</span>
                      &rdquo;
                    </>
                  )}
                  {specificDate && <span> on {specificDate}</span>}
                </p>
                {filteredArticles.length > 0 && (
                  <div className="flex items-center gap-2">
                    {(() => {
                      const withIntel = filteredArticles.filter(
                        (a) =>
                          (
                            a as Article & {
                              intelligence?: ArticleIntelligence;
                            }
                          ).intelligence
                      );
                      if (withIntel.length === 0) return null;
                      const types = new Map<string, number>();
                      withIntel.forEach((a) => {
                        const st = (
                          a as Article & {
                            intelligence?: ArticleIntelligence;
                          }
                        ).intelligence?.storyType;
                        if (st) types.set(st, (types.get(st) || 0) + 1);
                      });
                      return Array.from(types.entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([type, count]) => {
                          const style = STORY_TYPE_LABELS[type];
                          return (
                            <span
                              key={type}
                              className={`text-[10px] font-medium ${style?.color || "text-text-tertiary"}`}
                            >
                              {count} {style?.label || type}
                            </span>
                          );
                        });
                    })()}
                  </div>
                )}
              </div>
              {filteredArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onSave={onSave}
                  onOpenReader={onOpenReader}
                  onRequestSummary={onRequestSummary}
                  onExpand={onExpand}
                />
              ))}
              {filteredArticles.length === 0 && (
                <div className="rounded-xl border border-border-primary bg-bg-card p-6 text-center">
                  <Search
                    size={28}
                    className="mx-auto mb-2 text-text-tertiary"
                  />
                  <p className="text-sm text-text-secondary">
                    No articles found.
                  </p>
                  <p className="text-xs text-text-tertiary">
                    Try a different search term or adjust your filters.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-border-primary bg-bg-card p-6 text-center">
              <Search
                size={28}
                className="mx-auto mb-2 text-text-tertiary"
              />
              <p className="text-sm text-text-secondary">
                Search across all your articles, newsletters, and saved content.
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                Try searching for a company, person, topic, or keyword.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
