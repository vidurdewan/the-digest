"use client";

import { useState, useMemo } from "react";
import { Search, X, SlidersHorizontal, Calendar, Tag } from "lucide-react";
import type { Article, Summary, TopicCategory } from "@/types";
import { topicLabels, getRelativeTime } from "@/lib/mock-data";
import { ArticleCard } from "@/components/articles/ArticleCard";

interface SearchViewProps {
  articles: (Article & { summary?: Summary })[];
  onSave?: (id: string) => void;
  onOpenReader?: (article: Article & { summary?: Summary }) => void;
  onRequestSummary?: (
    article: Article & { summary?: Summary }
  ) => Promise<Summary | null>;
  onExpand?: (articleId: string) => void;
}

export function SearchView({ articles, onSave, onOpenReader, onRequestSummary, onExpand }: SearchViewProps) {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<TopicCategory | "all">(
    "all"
  );
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all">(
    "all"
  );

  const filteredArticles = useMemo(() => {
    let results = articles;

    // Text search
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
          a.summary?.keyEntities.some((e) =>
            e.name.toLowerCase().includes(q)
          )
      );
    }

    // Topic filter
    if (selectedTopic !== "all") {
      results = results.filter((a) => a.topic === selectedTopic);
    }

    // Date filter
    if (dateRange !== "all") {
      const now = Date.now();
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
  }, [articles, query, selectedTopic, dateRange]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Search size={24} className="text-accent-primary" />
        <h2 className="text-2xl font-bold text-text-primary">Search</h2>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles, topics, companies, people..."
          className="w-full rounded-xl border border-border-primary bg-bg-card py-3 pl-10 pr-20 text-sm text-text-primary placeholder-text-tertiary outline-none transition-colors focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {query && (
            <button
              onClick={() => setQuery("")}
              className="rounded-md p-1.5 text-text-tertiary hover:text-text-primary"
            >
              <X size={16} />
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
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-4 rounded-xl border border-border-primary bg-bg-secondary p-4">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-tertiary">
              <Tag size={12} />
              Topic
            </label>
            <select
              value={selectedTopic}
              onChange={(e) =>
                setSelectedTopic(e.target.value as TopicCategory | "all")
              }
              className="rounded-lg border border-border-primary bg-bg-card px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent-primary"
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
              <Calendar size={12} />
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) =>
                setDateRange(
                  e.target.value as "today" | "week" | "month" | "all"
                )
              }
              className="rounded-lg border border-border-primary bg-bg-card px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent-primary"
            >
              <option value="all">Any Time</option>
              <option value="today">Today</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
            </select>
          </div>
        </div>
      )}

      {/* Results */}
      {query || selectedTopic !== "all" || dateRange !== "all" ? (
        <div className="space-y-3">
          <p className="text-sm text-text-tertiary">
            {filteredArticles.length} result
            {filteredArticles.length !== 1 ? "s" : ""}
            {query && (
              <>
                {" "}
                for &ldquo;<span className="text-text-primary">{query}</span>
                &rdquo;
              </>
            )}
          </p>
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
            <div className="rounded-xl border border-border-primary bg-bg-card p-8 text-center">
              <Search
                size={32}
                className="mx-auto mb-3 text-text-tertiary"
              />
              <p className="text-text-secondary">No articles found.</p>
              <p className="text-sm text-text-tertiary">
                Try a different search term or adjust your filters.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border-primary bg-bg-card p-8 text-center">
          <Search size={32} className="mx-auto mb-3 text-text-tertiary" />
          <p className="text-text-secondary">
            Search across all your articles, newsletters, and saved content.
          </p>
          <p className="mt-1 text-sm text-text-tertiary">
            Try searching for a company, person, topic, or keyword.
          </p>
        </div>
      )}
    </div>
  );
}
