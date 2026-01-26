"use client";

import { useMemo } from "react";
import {
  UserCheck,
  UserMinus,
  TrendingUp,
  Award,
  ArrowRight,
  Building2,
  Landmark,
} from "lucide-react";
import type { Article, Summary } from "@/types";
import { detectAllMovements, type ExecutiveMove } from "@/lib/people-movements";
import { getRelativeTime } from "@/lib/mock-data";

interface PeopleMovesViewProps {
  articles: (Article & { summary?: Summary })[];
  onOpenReader?: (article: Article & { summary?: Summary }) => void;
}

const moveTypeConfig: Record<
  ExecutiveMove["moveType"],
  { icon: React.ReactNode; label: string; color: string }
> = {
  hire: {
    icon: <UserCheck size={14} />,
    label: "New Hire",
    color: "bg-green-100 text-green-700",
  },
  departure: {
    icon: <UserMinus size={14} />,
    label: "Departure",
    color: "bg-red-100 text-red-700",
  },
  promotion: {
    icon: <TrendingUp size={14} />,
    label: "Promotion",
    color: "bg-blue-100 text-blue-700",
  },
  "board-appointment": {
    icon: <Award size={14} />,
    label: "Board",
    color: "bg-purple-100 text-purple-700",
  },
};

export function PeopleMovesView({
  articles,
  onOpenReader,
}: PeopleMovesViewProps) {
  const moves = useMemo(() => detectAllMovements(articles), [articles]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserCheck size={24} className="text-accent-primary" />
        <div>
          <h2 className="text-2xl font-bold text-text-primary">
            People Moves
          </h2>
          <p className="text-sm text-text-tertiary">
            {moves.length} executive movement{moves.length !== 1 ? "s" : ""}{" "}
            detected
          </p>
        </div>
      </div>

      {moves.length > 0 ? (
        <div className="space-y-3">
          {moves.map((move, i) => (
            <MoveCard
              key={`${move.personName}-${move.moveType}-${i}`}
              move={move}
              article={articles.find((a) => a.id === move.articleId)}
              onOpenReader={onOpenReader}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border-primary bg-bg-card p-8 text-center">
          <UserCheck size={32} className="mx-auto mb-3 text-text-tertiary" />
          <p className="text-text-secondary">
            No executive movements detected yet.
          </p>
          <p className="mt-1 text-sm text-text-tertiary">
            As articles are ingested, executive changes will appear here
            automatically.
          </p>
        </div>
      )}
    </div>
  );
}

function MoveCard({
  move,
  article,
  onOpenReader,
}: {
  move: ExecutiveMove;
  article?: Article & { summary?: Summary };
  onOpenReader?: (article: Article & { summary?: Summary }) => void;
}) {
  const config = moveTypeConfig[move.moveType];

  return (
    <div
      className="rounded-xl border border-border-primary bg-bg-card p-4 transition-colors hover:border-accent-primary/20 hover:shadow-sm cursor-pointer"
      onClick={() => article && onOpenReader?.(article)}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-bg-secondary p-2">
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-semibold text-text-primary">
              {move.personName}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}
            >
              {config.label}
            </span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs ${
                move.confidence === "high"
                  ? "bg-green-100 text-green-600"
                  : move.confidence === "medium"
                    ? "bg-yellow-100 text-yellow-600"
                    : "bg-gray-100 text-gray-500"
              }`}
            >
              {move.confidence}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            {move.fromCompany && (
              <span className="flex items-center gap-1">
                <Building2 size={12} />
                {move.fromRole ? `${move.fromRole} @ ` : ""}
                {move.fromCompany}
              </span>
            )}
            {move.fromCompany && move.toCompany && (
              <ArrowRight size={14} className="text-text-tertiary" />
            )}
            {move.toCompany && (
              <span className="flex items-center gap-1">
                <Landmark size={12} />
                {move.toRole ? `${move.toRole} @ ` : ""}
                {move.toCompany}
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-text-tertiary">
            <span>{move.source}</span>
            <span>&middot;</span>
            <span>{getRelativeTime(move.publishedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
