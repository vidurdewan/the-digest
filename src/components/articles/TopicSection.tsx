"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Article, Summary, TopicCategory } from "@/types";
import { topicLabels } from "@/lib/mock-data";
import { ArticleCard } from "./ArticleCard";

interface TopicSectionProps {
  topic: TopicCategory;
  articles: (Article & { summary?: Summary })[];
  onSave?: (id: string) => void;
  onOpenReader?: (article: Article & { summary?: Summary }) => void;
  onRequestSummary?: (
    article: Article & { summary?: Summary }
  ) => Promise<Summary | null>;
  onExpand?: (articleId: string) => void;
  defaultOpen?: boolean;
}

export function TopicSection({
  topic,
  articles,
  onSave,
  onOpenReader,
  onRequestSummary,
  onExpand,
  defaultOpen = true,
}: TopicSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (articles.length === 0) return null;

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 py-1 text-left"
      >
        {isOpen ? (
          <ChevronDown size={18} className="text-text-tertiary" />
        ) : (
          <ChevronRight size={18} className="text-text-tertiary" />
        )}
        <h3 className="text-lg font-semibold text-text-primary">
          {topicLabels[topic]}
        </h3>
        <span className="rounded-full bg-bg-tertiary px-2 py-0.5 text-xs font-medium text-text-tertiary">
          {articles.length}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-3 pl-1">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onSave={onSave}
              onOpenReader={onOpenReader}
              onRequestSummary={onRequestSummary}
              onExpand={onExpand}
              hideTopic
            />
          ))}
        </div>
      )}
    </div>
  );
}
