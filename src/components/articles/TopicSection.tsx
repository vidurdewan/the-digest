"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Article, Summary, TopicCategory } from "@/types";
import { topicLabels, topicDotColors } from "@/lib/mock-data";
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
    <div className="border-b border-border-primary pb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-3 py-4 text-left"
      >
        <span
          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: topicDotColors[topic] }}
        />
        <h3 className="font-serif text-xl font-bold text-text-primary">
          {topicLabels[topic]}
        </h3>
        <span className="text-sm text-text-tertiary">
          {articles.length}
        </span>
        <span className="ml-auto">
          {isOpen ? (
            <ChevronDown size={16} className="text-text-tertiary" />
          ) : (
            <ChevronRight size={16} className="text-text-tertiary" />
          )}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-3 pb-2">
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
