"use client";

import { useState, useMemo } from "react";
import { topicLabels } from "@/lib/mock-data";
import type { Article, Summary, TopicCategory } from "@/types";
import { TopicSection } from "@/components/articles/TopicSection";
import { RefreshCw, Search } from "lucide-react";

interface NewsByTopicSectionProps {
  articles: (Article & { summary?: Summary })[];
  onSave: (id: string) => void;
  onOpenReader: (article: Article & { summary?: Summary }) => void;
  onRequestSummary?: (
    article: Article & { summary?: Summary }
  ) => Promise<Summary | null>;
  onExpand?: (articleId: string) => void;
  onIngest?: () => void;
  isIngesting?: boolean;
}

export function NewsByTopicSection({
  articles,
  onSave,
  onOpenReader,
  onRequestSummary,
  onExpand,
  onIngest,
  isIngesting,
}: NewsByTopicSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const topics = Object.keys(topicLabels) as TopicCategory[];

  const filteredArticles = useMemo(() => {
    if (!searchTerm.trim()) return articles;
    const term = searchTerm.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(term) ||
        a.source.toLowerCase().includes(term) ||
        (a.author && a.author.toLowerCase().includes(term))
    );
  }, [articles, searchTerm]);

  const grouped = topics.reduce(
    (acc, topic) => {
      acc[topic] = filteredArticles.filter((a) => a.topic === topic);
      return acc;
    },
    {} as Record<TopicCategory, (Article & { summary?: Summary })[]>
  );

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between pb-8">
        <div>
          <h2 className="font-serif text-3xl font-bold text-text-primary">
            News by Topic
          </h2>
          <p className="mt-1 text-sm text-text-tertiary">
            Browse by category
          </p>
        </div>
        {onIngest && (
          <button
            onClick={onIngest}
            disabled={isIngesting}
            className="pill-outlined flex items-center gap-1.5 transition-colors hover:bg-bg-hover disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={isIngesting ? "animate-spin" : ""}
            />
            {isIngesting ? "Fetching..." : "Fetch News"}
          </button>
        )}
      </div>

      {/* Search filter */}
      <div className="relative border-b border-border-primary pb-6">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter articles by title, source, or author..."
          className="w-full border-b border-border-secondary bg-transparent pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none transition-colors"
        />
      </div>

      <div className="space-y-0">
        {topics
          .filter((t) => grouped[t].length > 0)
          .map((topic) => (
            <TopicSection
              key={topic}
              topic={topic}
              articles={grouped[topic]}
              onSave={onSave}
              onOpenReader={onOpenReader}
              onRequestSummary={onRequestSummary}
              onExpand={onExpand}
              defaultOpen={true}
            />
          ))}
      </div>

      {searchTerm && filteredArticles.length === 0 && (
        <p className="text-center text-sm text-text-tertiary py-8">
          No articles match &ldquo;{searchTerm}&rdquo;
        </p>
      )}
    </div>
  );
}
