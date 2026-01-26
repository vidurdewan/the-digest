"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Check } from "lucide-react";

interface RemindMeButtonProps {
  articleId: string;
}

const REMIND_OPTIONS = [
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
];

export function RemindMeButton({ articleId }: RemindMeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSet, setIsSet] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [isOpen]);

  const handleSetReminder = async (days: number, label: string) => {
    const remindAt = new Date();
    remindAt.setDate(remindAt.getDate() + days);

    setIsSet(true);
    setSelectedLabel(label);
    setIsOpen(false);

    try {
      await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          remindAt: remindAt.toISOString(),
        }),
      });
    } catch {
      // Silent failure
    }
  };

  if (isSet) {
    return (
      <span className="flex items-center gap-1 rounded-full border border-accent-success/30 px-2 py-1 text-[11px] font-medium text-accent-success">
        <Check size={11} />
        Reminder: {selectedLabel}
      </span>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-1 rounded-full border border-border-primary px-2 py-1 text-[11px] font-medium text-text-tertiary hover:text-text-secondary hover:border-border-secondary transition-colors"
      >
        <Bell size={11} />
        Remind me
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 z-20 mb-1 rounded-lg border border-border-primary bg-bg-card py-1 shadow-lg">
          {REMIND_OPTIONS.map(({ label, days }) => (
            <button
              key={days}
              onClick={(e) => {
                e.stopPropagation();
                handleSetReminder(days, label);
              }}
              className="block w-full px-4 py-1.5 text-left text-xs text-text-secondary hover:bg-bg-hover transition-colors whitespace-nowrap"
            >
              In {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
