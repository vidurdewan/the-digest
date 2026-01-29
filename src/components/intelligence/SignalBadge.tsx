"use client";

import { Radar, TrendingUp, Zap, AlertTriangle, Activity } from "lucide-react";
import type { ArticleSignal, SignalType } from "@/types";

const SIGNAL_CONFIG: Record<SignalType, {
  icon: typeof Radar;
  bg: string;
  text: string;
  border: string;
}> = {
  first_mention: {
    icon: Radar,
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  tier1_before_mainstream: {
    icon: Zap,
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  convergence: {
    icon: TrendingUp,
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  unusual_activity: {
    icon: AlertTriangle,
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
  sentiment_shift: {
    icon: Activity,
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
};

const SIGNAL_DESCRIPTIONS: Record<SignalType, string> = {
  first_mention: "This entity is appearing in your feed for the first time.",
  tier1_before_mainstream: "A premium source reported this before mainstream outlets.",
  convergence: "Multiple independent sources are covering this simultaneously.",
  unusual_activity: "Activity patterns around this entity deviate from normal.",
  sentiment_shift: "Media tone around this entity has notably changed direction.",
};

interface SignalBadgeProps {
  signal: ArticleSignal;
  compact?: boolean;
}

export function SignalBadge({ signal, compact = false }: SignalBadgeProps) {
  const config = SIGNAL_CONFIG[signal.signalType];
  const Icon = config.icon;
  const description = SIGNAL_DESCRIPTIONS[signal.signalType];

  return (
    <span className="group/tooltip relative inline-flex">
      <span
        className={`pill-outlined inline-flex items-center gap-${compact ? "1" : "1.5"} ${compact ? "px-1.5 py-0.5 text-[9px]" : ""} cursor-help`}
      >
        <Icon size={compact ? 9 : 11} />
        {signal.signalLabel}
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg border border-border-primary bg-bg-card p-3 text-xs font-normal normal-case tracking-normal text-text-secondary shadow-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-50">
        <span className="block font-semibold text-text-primary mb-1">
          {signal.signalLabel}
        </span>
        {description}
      </span>
    </span>
  );
}

interface SignalBadgesProps {
  signals?: ArticleSignal[];
  compact?: boolean;
  max?: number;
}

export function SignalBadges({ signals, compact = false, max = 3 }: SignalBadgesProps) {
  if (!signals || signals.length === 0) return null;

  const shown = signals.slice(0, max);

  return (
    <>
      {shown.map((signal) => (
        <SignalBadge key={signal.id} signal={signal} compact={compact} />
      ))}
    </>
  );
}
