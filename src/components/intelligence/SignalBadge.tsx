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

interface SignalBadgeProps {
  signal: ArticleSignal;
  compact?: boolean;
}

export function SignalBadge({ signal, compact = false }: SignalBadgeProps) {
  const config = SIGNAL_CONFIG[signal.signalType];
  const Icon = config.icon;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${config.bg} ${config.text} ${config.border}`}
        title={signal.signalLabel}
      >
        <Icon size={9} />
        {signal.signalLabel}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${config.bg} ${config.text} ${config.border}`}
    >
      <Icon size={11} />
      {signal.signalLabel}
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
