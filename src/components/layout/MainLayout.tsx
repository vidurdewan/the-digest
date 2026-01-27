"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useSidebarStore } from "@/lib/store";
import { useRef, useEffect, useState } from "react";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const activeSection = useSidebarStore((s) => s.activeSection);
  const [animKey, setAnimKey] = useState(activeSection);

  useEffect(() => {
    setAnimKey(activeSection);
  }, [activeSection]);

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary transition-theme">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 lg:px-8">
          <div key={animKey} className="page-enter mx-auto max-w-4xl">
            {children}
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
