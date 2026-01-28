"use client";

import { useState, useRef, useEffect } from "react";
import { useSidebarStore, useThemeStore } from "@/lib/store";
import { PanelLeft, Bell, Sun, Moon, Newspaper } from "lucide-react";
import type { Theme } from "@/types";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const themeIcons: Record<Theme, React.ReactNode> = {
  light: <Sun size={15} />,
  dark: <Moon size={15} />,
  newspaper: <Newspaper size={15} />,
};
const themeLabels: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  newspaper: "Paper",
};

export function Header() {
  const { isOpen, toggle } = useSidebarStore();
  const { theme } = useThemeStore();
  const [themeOpen, setThemeOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Click-outside handler for both dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border-secondary bg-bg-primary/80 px-4 backdrop-blur-sm transition-theme md:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile/collapsed sidebar toggle */}
        {!isOpen && (
          <button
            onClick={toggle}
            className="rounded-md p-1.5 text-text-secondary hover:bg-bg-hover hover:text-text-primary lg:hidden transition-theme"
            aria-label="Open sidebar"
          >
            <PanelLeft size={20} />
          </button>
        )}
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight text-text-primary lg:hidden">
            The Digest
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Theme dropdown */}
        <div ref={themeRef} className="relative">
          <button
            onClick={() => {
              setThemeOpen(!themeOpen);
              setNotifOpen(false);
            }}
            className="rounded-lg p-2 text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors"
            aria-label={`Theme: ${themeLabels[theme]}`}
            title={`Theme: ${themeLabels[theme]}`}
          >
            {themeIcons[theme]}
          </button>
          {themeOpen && (
            <div className="absolute right-0 top-full mt-2 rounded-xl border border-border-primary bg-bg-card p-2 shadow-lg z-50">
              <ThemeToggle />
            </div>
          )}
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => {
              setNotifOpen(!notifOpen);
              setThemeOpen(false);
            }}
            className="relative rounded-lg p-2 text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors"
            aria-label="Notifications"
          >
            <Bell size={16} />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border-primary bg-bg-card p-4 shadow-lg z-50">
              <h4 className="text-sm font-semibold text-text-primary mb-2">
                Notifications
              </h4>
              <p className="text-xs text-text-tertiary leading-relaxed">
                No new notifications. Watchlist alerts and breaking news will
                appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
