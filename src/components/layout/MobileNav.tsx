"use client";

import { useSidebarStore } from "@/lib/store";
import { Zap, Mail, Newspaper, Radar, Bookmark, Settings, MoreHorizontal } from "lucide-react";
import { useState } from "react";

const primaryNavItems = [
  { id: "priority-feed", label: "Feed", icon: Zap },
  { id: "newsletters", label: "Letters", icon: Mail },
  { id: "news", label: "News", icon: Newspaper },
  { id: "intelligence", label: "Intel", icon: Radar },
  { id: "saved", label: "Saved", icon: Bookmark },
];

const moreNavItems = [
  { id: "settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const { activeSection, setActiveSection } = useSidebarStore();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {/* "More" sheet backdrop */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-[59] bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* "More" bottom sheet */}
      {moreOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] rounded-t-2xl border-t border-border-primary bg-bg-card shadow-xl pb-safe-bottom lg:hidden mobile-sheet-enter">
          <div className="mx-auto mt-2 mb-1 h-1 w-8 rounded-full bg-border-primary" />
          <nav className="px-4 pb-4 pt-2">
            {moreNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setMoreOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-bg-active text-accent-primary"
                      : "text-text-secondary hover:bg-bg-hover"
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          {/* Extra spacing for safe area */}
          <div className="h-safe-bottom" />
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-secondary bg-bg-primary/90 backdrop-blur-md transition-theme lg:hidden pb-safe-bottom">
        <ul className="flex items-stretch justify-around">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <li key={item.id} className="flex-1">
                <button
                  onClick={() => {
                    setActiveSection(item.id);
                    setMoreOpen(false);
                  }}
                  className={`flex w-full flex-col items-center justify-center gap-0.5 min-h-[52px] pt-2 pb-1 text-[10px] font-semibold tracking-wide transition-colors ${
                    isActive
                      ? "text-accent-primary"
                      : "text-text-tertiary active:text-text-primary"
                  }`}
                >
                  <span className="relative">
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-accent-primary" />
                    )}
                  </span>
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
          {/* More button */}
          <li className="flex-1">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={`flex w-full flex-col items-center justify-center gap-0.5 min-h-[52px] pt-2 pb-1 text-[10px] font-semibold tracking-wide transition-colors ${
                moreOpen || moreNavItems.some((i) => i.id === activeSection)
                  ? "text-accent-primary"
                  : "text-text-tertiary active:text-text-primary"
              }`}
            >
              <MoreHorizontal size={22} strokeWidth={2} />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
