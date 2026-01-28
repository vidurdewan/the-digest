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
  embedded?: boolean;
}

const moveTypeConfig: Record<
  ExecutiveMove["moveType"],
  { icon: React.ReactNode; label: string; color: string }
> = {
  hire: {
    icon: <UserCheck size={14} />,
    label: "New Hire",
    color: "bg-accent-success/15 text-accent-success",
  },
  departure: {
    icon: <UserMinus size={14} />,
    label: "Departure",
    color: "bg-accent-danger/15 text-accent-danger",
  },
  promotion: {
    icon: <TrendingUp size={14} />,
    label: "Promotion",
    color: "bg-accent-primary/15 text-accent-primary",
  },
  "board-appointment": {
    icon: <Award size={14} />,
    label: "Board",
    color: "bg-accent-warning/15 text-accent-warning",
  },
};

function isValidPersonName(name: string): boolean {
  // Filter out garbage regex captures
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 60) return false;
  // Must contain at least two words (first + last name)
  const words = trimmed.split(/\s+/);
  if (words.length < 2 || words.length > 5) return false;
  // Should start with uppercase
  if (!/^[A-Z]/.test(trimmed)) return false;
  // Should not contain numbers or special chars (except hyphens/apostrophes)
  if (/[0-9@#$%^&*()=+[\]{}|\\/<>]/.test(trimmed)) return false;
  // Each word should be reasonable length
  if (words.some((w) => w.length > 20)) return false;
  return true;
}

export function PeopleMovesView({
  articles,
  onOpenReader,
  embedded,
}: PeopleMovesViewProps) {
  const allMoves = useMemo(() => detectAllMovements(articles), [articles]);

  // Filter to medium/high confidence with valid person names
  const moves = useMemo(
    () =>
      allMoves.filter(
        (m) =>
          (m.confidence === "high" || m.confidence === "medium") &&
          isValidPersonName(m.personName)
      ),
    [allMoves]
  );

  return (
    <div className="space-y-6">
      {!embedded && (
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
      )}

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
          {moves.length <= 3 && (
            <p className="pt-4 text-center text-xs text-text-tertiary">
              Movements are extracted from article titles and summaries. More will appear as articles are ingested.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border-secondary bg-bg-card p-12 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-secondary">
            <UserCheck size={28} className="text-text-tertiary opacity-50" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-1.5">
            No executive movements detected
          </h3>
          <p className="text-sm text-text-secondary max-w-sm mx-auto">
            Executive moves appear here automatically &mdash; detected from your news sources.
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
      className="card-interactive rounded-xl border border-border-secondary bg-bg-card p-4 cursor-pointer"
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
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            {move.fromCompany && (
              <span className="flex items-center gap-1">
                <Building2 size={12} />
                {move.fromRole && move.fromRole.length > 1 && /^[A-Z]/.test(move.fromRole) ? `${move.fromRole} @ ` : ""}
                {move.fromCompany}
              </span>
            )}
            {move.fromCompany && move.toCompany && (
              <ArrowRight size={14} className="text-text-tertiary" />
            )}
            {move.toCompany && (
              <span className="flex items-center gap-1">
                <Landmark size={12} />
                {move.toRole && move.toRole.length > 1 && /^[A-Z]/.test(move.toRole) ? `${move.toRole} @ ` : ""}
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
