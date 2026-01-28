"use client";

import { useState, useMemo } from "react";
import {
  Building2,
  Landmark,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  UserCheck,
  Newspaper,
  Search,
} from "lucide-react";
import type { Article, Summary } from "@/types";
import {
  aggregateByCompany,
  type CompanyIntelligence,
} from "@/lib/people-movements";
import { topicLabels, getRelativeTime } from "@/lib/mock-data";
import { ArticleCard } from "@/components/articles/ArticleCard";

interface CompanyViewProps {
  articles: (Article & { summary?: Summary })[];
  onSave?: (id: string) => void;
  onOpenReader?: (article: Article & { summary?: Summary }) => void;
  onRequestSummary?: (
    article: Article & { summary?: Summary }
  ) => Promise<Summary | null>;
  onExpand?: (articleId: string) => void;
}

export function CompanyView({
  articles,
  onSave,
  onOpenReader,
  onRequestSummary,
  onExpand,
}: CompanyViewProps) {
  const companies = useMemo(() => aggregateByCompany(articles), [articles]);
  const [filter, setFilter] = useState<"all" | "company" | "fund">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    let result = filter === "all" ? companies : companies.filter((c) => c.type === filter);
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(term));
    }
    return result;
  }, [companies, filter, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 size={24} className="text-accent-primary" />
        <div>
          <h2 className="text-2xl font-bold text-text-primary">
            Company Intelligence
          </h2>
          <p className="text-sm text-text-tertiary">
            {companies.length} entit{companies.length !== 1 ? "ies" : "y"}{" "}
            tracked across {articles.length} articles
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search companies and funds..."
          className="w-full rounded-xl border border-border-secondary bg-bg-secondary pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none transition-colors"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "company", "fund"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-accent-primary text-text-inverse"
                : "bg-bg-secondary text-text-secondary hover:bg-bg-hover"
            }`}
          >
            {f === "all" ? "All" : f === "company" ? "Companies" : "Funds"}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((company) => (
            <CompanyCard
              key={company.name}
              company={company}
              onSave={onSave}
              onOpenReader={onOpenReader}
              onRequestSummary={onRequestSummary}
              onExpand={onExpand}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border-primary bg-bg-card p-8 text-center">
          <Building2 size={32} className="mx-auto mb-3 text-text-tertiary" />
          <p className="text-text-secondary">No companies found.</p>
          <p className="mt-1 text-sm text-text-tertiary">
            Companies and funds mentioned in articles will be aggregated here.
          </p>
        </div>
      )}
    </div>
  );
}

function CompanyCard({
  company,
  onSave,
  onOpenReader,
  onRequestSummary,
  onExpand,
}: {
  company: CompanyIntelligence;
  onSave?: (id: string) => void;
  onOpenReader?: (article: Article & { summary?: Summary }) => void;
  onRequestSummary?: (
    article: Article & { summary?: Summary }
  ) => Promise<Summary | null>;
  onExpand?: (articleId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border-primary bg-bg-card overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-bg-hover/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-bg-secondary p-2">
            {company.type === "fund" ? (
              <Landmark size={16} className="text-accent-primary" />
            ) : (
              <Building2 size={16} className="text-accent-primary" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">{company.name}</h3>
            <div className="flex items-center gap-3 text-xs text-text-tertiary">
              <span className="flex items-center gap-1">
                <Newspaper size={10} />
                {company.articleCount} article
                {company.articleCount !== 1 ? "s" : ""}
              </span>
              {company.recentMoves.length > 0 && (
                <span className="flex items-center gap-1">
                  <UserCheck size={10} />
                  {company.recentMoves.length} move
                  {company.recentMoves.length !== 1 ? "s" : ""}
                </span>
              )}
              <span>Last: {getRelativeTime(company.lastMentioned)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex gap-1">
            {company.topics.slice(0, 3).map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-bg-secondary px-2 py-0.5 text-xs text-text-tertiary"
              >
                {topicLabels[topic as keyof typeof topicLabels] || topic}
              </span>
            ))}
          </div>
          {isOpen ? (
            <ChevronUp size={16} className="text-text-tertiary" />
          ) : (
            <ChevronDown size={16} className="text-text-tertiary" />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-border-secondary p-4 space-y-3">
          {/* Executive Moves */}
          {company.recentMoves.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                Executive Moves
              </h4>
              <div className="space-y-1.5">
                {company.recentMoves.map((move, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg bg-bg-secondary px-3 py-2 text-sm"
                  >
                    <TrendingUp size={12} className="text-accent-primary" />
                    <span className="text-text-primary font-medium">
                      {move.personName}
                    </span>
                    <span className="text-text-tertiary">
                      {move.moveType === "hire"
                        ? "joined"
                        : move.moveType === "departure"
                          ? "departed"
                          : move.moveType === "promotion"
                            ? "promoted"
                            : "board appointment"}
                    </span>
                    {move.toRole && (
                      <span className="text-text-secondary">
                        as {move.toRole}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Articles */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Related Articles ({company.articleCount})
            </h4>
            <div className="space-y-2">
              {company.articles.slice(0, 5).map((article) => (
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
          </div>
        </div>
      )}
    </div>
  );
}
