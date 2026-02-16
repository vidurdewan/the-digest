"use client";

import { useState, useMemo } from "react";
import { Eye, UserCheck, Building2, Sparkles } from "lucide-react";
import type { Article, Summary, WatchlistItem } from "@/types";
import { WatchlistView } from "@/components/watchlist/WatchlistView";
import { PeopleMovesView } from "@/components/intelligence/PeopleMovesView";
import { CompanyView } from "@/components/intelligence/CompanyView";
import { MorningBriefingView } from "@/components/intelligence/MorningBriefingView";
import { detectAllMovements, aggregateByCompany } from "@/lib/people-movements";

type IntelligenceTab = "briefing" | "watchlist" | "people" | "companies";

interface IntelligenceViewProps {
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

const tabs: { id: IntelligenceTab; label: string; icon: typeof Eye }[] = [
  { id: "briefing", label: "Briefing", icon: Sparkles },
  { id: "watchlist", label: "Watchlist", icon: Eye },
  { id: "people", label: "People", icon: UserCheck },
  { id: "companies", label: "Companies", icon: Building2 },
];

export function IntelligenceView({
  watchlist,
  articles,
  onSave,
  onOpenReader,
  onRequestSummary,
  onAddItem,
  onRemoveItem,
  onExpand,
}: IntelligenceViewProps) {
  const [activeTab, setActiveTab] = useState<IntelligenceTab>("briefing");

  const matchCount = useMemo(
    () => articles.filter((a) => a.watchlistMatches.length > 0).length,
    [articles]
  );
  const moveCount = useMemo(() => {
    const moves = detectAllMovements(articles);
    return moves.filter(
      (m) => m.confidence === "high" || m.confidence === "medium"
    ).length;
  }, [articles]);
  const entityCount = useMemo(
    () => aggregateByCompany(articles).length,
    [articles]
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="font-serif text-3xl font-bold text-text-primary">Intelligence</h2>
        <p className="text-sm text-text-tertiary">
          {watchlist.length} watched &middot; {matchCount} match
          {matchCount !== 1 ? "es" : ""} &middot; {moveCount} move
          {moveCount !== 1 ? "s" : ""} &middot; {entityCount} entit
          {entityCount !== 1 ? "ies" : "y"}
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-6 border-b border-border-primary">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? "text-text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-text-primary"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      <div key={activeTab} className="section-enter">
        {activeTab === "briefing" && <MorningBriefingView />}
        {activeTab === "watchlist" && (
          <WatchlistView
            watchlist={watchlist}
            articles={articles}
            onSave={onSave}
            onOpenReader={onOpenReader}
            onRequestSummary={onRequestSummary}
            onAddItem={onAddItem}
            onRemoveItem={onRemoveItem}
            onExpand={onExpand}
            embedded
          />
        )}
        {activeTab === "people" && (
          <PeopleMovesView
            articles={articles}
            onOpenReader={onOpenReader}
            embedded
          />
        )}
        {activeTab === "companies" && (
          <CompanyView
            articles={articles}
            onSave={onSave}
            onOpenReader={onOpenReader}
            onRequestSummary={onRequestSummary}
            onExpand={onExpand}
            embedded
          />
        )}
      </div>
    </div>
  );
}
