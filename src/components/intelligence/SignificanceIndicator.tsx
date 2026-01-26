"use client";

import { TrendingUp } from "lucide-react";
import type { SignificanceLevel } from "@/types";

function getColor(score: number): string {
  if (score >= 8) return "#dc2626";
  if (score >= 6) return "#f59e0b";
  if (score >= 4) return "#3b82f6";
  return "#9ca3af";
}

export function SignificanceIndicator({ score }: { score: SignificanceLevel }) {
  return (
    <div className="flex items-center gap-1" title={`Significance: ${score}/10`}>
      <TrendingUp size={12} className="text-text-tertiary" />
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: i < score ? getColor(score) : "var(--border-primary)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
