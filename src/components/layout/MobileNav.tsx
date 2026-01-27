"use client";

import { useSidebarStore } from "@/lib/store";
import { Zap, Mail, Newspaper, Eye, Bookmark } from "lucide-react";

const mobileNavItems = [
  { id: "priority-feed", label: "Feed", icon: Zap },
  { id: "newsletters", label: "Letters", icon: Mail },
  { id: "news", label: "News", icon: Newspaper },
  { id: "watchlist", label: "Watchlist", icon: Eye },
  { id: "saved", label: "Saved", icon: Bookmark },
];

export function MobileNav() {
  const { activeSection, setActiveSection } = useSidebarStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border-secondary bg-bg-primary/95 backdrop-blur-sm transition-theme lg:hidden">
      <ul className="flex items-center justify-around">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <li key={item.id} className="flex-1">
              <button
                onClick={() => setActiveSection(item.id)}
                className={`flex w-full flex-col items-center gap-1 py-2 text-xs font-medium transition-theme ${
                  isActive
                    ? "text-accent-primary"
                    : "text-text-tertiary"
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
