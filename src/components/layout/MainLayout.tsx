"use client";

import { Sidebar } from "./Sidebar";
import { EditorialHeader, type EditorialHeaderProps } from "./Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useSidebarStore } from "@/lib/store";
import { useRef, useEffect, useState } from "react";

// Sections where the aside rail should be hidden (full-width main)
const FULL_WIDTH_SECTIONS = new Set([
  "settings",
  "sources",
  "saved",
  "intelligence",
  "brief",
  "weekly-synthesis",
]);

export function MainLayout({
  children,
  headerProps,
}: {
  children: React.ReactNode;
  headerProps?: EditorialHeaderProps;
}) {
  const activeSection = useSidebarStore((s) => s.activeSection);
  const [animKey, setAnimKey] = useState(activeSection);
  const [isExiting, setIsExiting] = useState(false);
  const prevSection = useRef(activeSection);

  useEffect(() => {
    if (activeSection !== prevSection.current) {
      prevSection.current = activeSection;
      setIsExiting(true);
      const timer = setTimeout(() => {
        setAnimKey(activeSection);
        setIsExiting(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeSection]);

  const showAside = !FULL_WIDTH_SECTIONS.has(activeSection);

  return (
    <div className="min-h-screen bg-bg-primary transition-theme">
      <Sidebar />
      <EditorialHeader {...headerProps} />
      <div
        className={`editorial-content mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-6 ${
          showAside ? "lg:grid lg:grid-cols-[1fr_340px] lg:gap-12" : ""
        }`}
      >
        <main>
          <div
            key={animKey}
            className={`mx-auto ${showAside ? "max-w-4xl" : "max-w-5xl"} ${
              isExiting ? "page-exit" : "page-enter"
            }`}
          >
            {children}
          </div>
        </main>
        {showAside && (
          <aside className="hidden lg:block">
            <div className="sticky top-[calc(3.5rem+1.5rem)]">
              <div className="rounded-xl border border-border-secondary bg-bg-card p-6 text-sm text-text-tertiary">
                Newsletter rail — Phase 3
              </div>
            </div>
          </aside>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}
