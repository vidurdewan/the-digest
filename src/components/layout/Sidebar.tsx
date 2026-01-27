"use client";

import { useSidebarStore, navigationSections } from "@/lib/store";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  Zap,
  Mail,
  Newspaper,
  Eye,
  Bookmark,
  Search,
  Settings,
  Rss,
  PanelLeftClose,
  PanelLeft,
  UserCheck,
  Building2,
  MessageSquare,
  FileText,
  BookOpen,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  Zap: <Zap size={20} />,
  Mail: <Mail size={20} />,
  Newspaper: <Newspaper size={20} />,
  Eye: <Eye size={20} />,
  Bookmark: <Bookmark size={20} />,
  Search: <Search size={20} />,
  Rss: <Rss size={20} />,
  Settings: <Settings size={20} />,
  UserCheck: <UserCheck size={20} />,
  Building2: <Building2 size={20} />,
  MessageSquare: <MessageSquare size={20} />,
  FileText: <FileText size={20} />,
  BookOpen: <BookOpen size={20} />,
};

export function Sidebar() {
  const { isOpen, activeSection, toggle, setActiveSection } =
    useSidebarStore();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={toggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 flex h-full flex-col border-r border-border-secondary bg-bg-sidebar transition-all duration-300 lg:relative lg:z-auto ${
          isOpen ? "w-64" : "w-0 lg:w-16"
        } overflow-hidden`}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-border-secondary px-4">
          {isOpen && (
            <h1 className="font-heading text-lg font-bold text-text-primary whitespace-nowrap tracking-tight">
              The Digest
            </h1>
          )}
          <button
            onClick={toggle}
            className="rounded-md p-1.5 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-theme"
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="space-y-1">
            {navigationSections.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <li key={section.id}>
                  <button
                    onClick={() => setActiveSection(section.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-bg-active text-accent-primary"
                        : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                    }`}
                    title={section.label}
                  >
                    <span className="shrink-0">
                      {iconMap[section.icon]}
                    </span>
                    {isOpen && (
                      <span className="whitespace-nowrap">{section.label}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer with theme toggle */}
        {isOpen && (
          <div className="border-t border-border-secondary p-4">
            <ThemeToggle />
          </div>
        )}
      </aside>
    </>
  );
}
