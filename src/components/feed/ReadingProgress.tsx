"use client";

import { CheckCircle } from "lucide-react";

interface ReadingProgressProps {
  totalItems: number;
  readItems: number;
}

export function ReadingProgress({ totalItems, readItems }: ReadingProgressProps) {
  const percent = totalItems > 0 ? Math.round((readItems / totalItems) * 100) : 0;
  const allRead = readItems >= totalItems && totalItems > 0;

  // SVG ring geometry
  const size = 32;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percent / 100);

  return (
    <div className="sticky top-0 z-10 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-3 bg-bg-primary/95 backdrop-blur-sm border-b border-transparent [&:not(:first-child)]:border-border-secondary/50">
      <div className="flex items-center gap-3">
        {/* Circular SVG ring */}
        <div className="relative" style={{ width: size, height: size }}>
          {/* Background track */}
          <svg
            width={size}
            height={size}
            className="rotate-[-90deg]"
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--bg-tertiary)"
              strokeWidth={strokeWidth}
            />
            {/* Filled arc */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={allRead ? "var(--accent-success)" : "var(--accent-primary)"}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{
                transition: "stroke-dashoffset 300ms ease-out, stroke 300ms ease-out",
              }}
            />
          </svg>
          {/* Check icon when complete */}
          {allRead && (
            <div className="absolute inset-0 flex items-center justify-center">
              <CheckCircle size={14} className="text-accent-success" />
            </div>
          )}
        </div>

        {/* Text */}
        <span className="text-xs font-medium text-text-secondary">
          {allRead
            ? "All caught up"
            : `${readItems} read of ${totalItems}`}
        </span>
      </div>
    </div>
  );
}
