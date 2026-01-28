"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useSidebarStore } from "@/lib/store";
import { useRef, useEffect, useState } from "react";

export function MainLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary transition-theme">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 lg:px-8">
          <div key={animKey} className={`mx-auto max-w-4xl ${isExiting ? "page-exit" : "page-enter"}`}>
            {children}
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
