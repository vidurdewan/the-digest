"use client";

import { useSidebarStore } from "@/lib/store";
import { PanelLeft, Bell, RefreshCw } from "lucide-react";

export function Header() {
  const { isOpen, toggle } = useSidebarStore();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border-primary bg-bg-primary/80 px-4 backdrop-blur-sm transition-theme md:px-6">
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
          <h2 className="text-lg font-semibold text-text-primary lg:hidden">
            The Digest
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="rounded-md p-2 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-theme"
          aria-label="Refresh content"
        >
          <RefreshCw size={18} />
        </button>
        <button
          className="relative rounded-md p-2 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-theme"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent-danger" />
        </button>
      </div>
    </header>
  );
}
