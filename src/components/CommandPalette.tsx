"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search,
  X,
  Zap,
  Mail,
  Newspaper,
  Eye,
  Bookmark,
  Rss,
  Settings,
  UserCheck,
  Building2,
  MessageSquare,
  FileText,
  BookOpen,
  FileSearch,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  useSidebarStore,
  useOverlayStore,
  navigationGroups,
  bottomNavSections,
} from "@/lib/store";
import type { Article, Summary } from "@/types";

const iconMap: Record<string, React.ReactNode> = {
  Zap: <Zap size={16} />,
  Mail: <Mail size={16} />,
  Newspaper: <Newspaper size={16} />,
  Eye: <Eye size={16} />,
  Bookmark: <Bookmark size={16} />,
  Search: <Search size={16} />,
  Rss: <Rss size={16} />,
  Settings: <Settings size={16} />,
  UserCheck: <UserCheck size={16} />,
  Building2: <Building2 size={16} />,
  MessageSquare: <MessageSquare size={16} />,
  FileText: <FileText size={16} />,
  BookOpen: <BookOpen size={16} />,
};

type PaletteItemType = "nav" | "tool" | "article";

interface PaletteItem {
  id: string;
  label: string;
  icon: string;
  type: PaletteItemType;
  article?: Article & { summary?: Summary };
}

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

interface CommandPaletteProps {
  articles: (Article & { summary?: Summary })[];
  onOpenReader: (article: Article & { summary?: Summary }) => void;
}

export function CommandPalette({ articles, onOpenReader }: CommandPaletteProps) {
  const { commandPaletteOpen, closeCommandPalette, openSearchOverlay, openChatPanel } =
    useOverlayStore();
  const { setActiveSection } = useSidebarStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build flat item list
  const allItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [];

    // Navigation destinations (Feed + Intelligence groups, plus bottom nav)
    const navGroups = navigationGroups.filter((g) => g.label !== "Tools");
    for (const group of navGroups) {
      for (const section of group.items) {
        items.push({ id: section.id, label: section.label, icon: section.icon, type: "nav" });
      }
    }
    for (const section of bottomNavSections) {
      items.push({ id: section.id, label: section.label, icon: section.icon, type: "nav" });
    }

    // Tools
    const toolsGroup = navigationGroups.find((g) => g.label === "Tools");
    if (toolsGroup) {
      for (const section of toolsGroup.items) {
        items.push({ id: section.id, label: section.label, icon: section.icon, type: "tool" });
      }
    }

    // Recent articles (first 5)
    const recent = articles.slice(0, 5);
    for (const article of recent) {
      items.push({
        id: `article-${article.id}`,
        label: article.title,
        icon: "FileSearch",
        type: "article",
        article,
      });
    }

    return items;
  }, [articles]);

  // Filter items by query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    return allItems.filter((item) => fuzzyMatch(query, item.label));
  }, [allItems, query]);

  // Group filtered items for display
  const groupedItems = useMemo(() => {
    const nav = filteredItems.filter((i) => i.type === "nav");
    const tools = filteredItems.filter((i) => i.type === "tool");
    const recentArticles = filteredItems.filter((i) => i.type === "article");
    return { nav, tools, articles: recentArticles };
  }, [filteredItems]);

  // Flat list for arrow navigation
  const flatFiltered = useMemo(
    () => [...groupedItems.nav, ...groupedItems.tools, ...groupedItems.articles],
    [groupedItems]
  );

  // Reset on open
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [commandPaletteOpen]);

  // Clamp selectedIndex when filtered list changes
  useEffect(() => {
    setSelectedIndex((prev) => Math.min(prev, Math.max(0, flatFiltered.length - 1)));
  }, [flatFiltered.length]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-palette-index="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const selectItem = useCallback(
    (item: PaletteItem) => {
      closeCommandPalette();
      if (item.type === "article" && item.article) {
        onOpenReader(item.article);
        return;
      }
      if (item.id === "search") {
        openSearchOverlay();
        return;
      }
      if (item.id === "chat") {
        openChatPanel();
        return;
      }
      // All other items (nav, brief, weekly-synthesis) navigate
      setActiveSection(item.id);
    },
    [closeCommandPalette, openSearchOverlay, openChatPanel, setActiveSection, onOpenReader]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, flatFiltered.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (flatFiltered[selectedIndex]) {
            selectItem(flatFiltered[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          closeCommandPalette();
          break;
      }
    },
    [flatFiltered, selectedIndex, selectItem, closeCommandPalette]
  );

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        useOverlayStore.getState().toggleCommandPalette();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!commandPaletteOpen) return null;

  let flatIndex = 0;

  const renderSection = (
    label: string,
    items: PaletteItem[],
    startIndex: number
  ) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
          {label}
        </div>
        {items.map((item, i) => {
          const idx = startIndex + i;
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={item.id}
              data-palette-index={idx}
              onClick={() => selectItem(item)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isSelected
                  ? "bg-accent-primary/10 text-accent-primary"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              <span className="shrink-0 text-text-tertiary">
                {item.type === "article" ? (
                  <FileSearch size={16} />
                ) : (
                  iconMap[item.icon] || <Search size={16} />
                )}
              </span>
              <span className="truncate">{item.label}</span>
              {item.type === "tool" && (
                <span className="ml-auto shrink-0 rounded bg-bg-tertiary px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
                  Tool
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const navStart = 0;
  const toolsStart = groupedItems.nav.length;
  const articlesStart = toolsStart + groupedItems.tools.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm reading-pane-backdrop"
      onClick={closeCommandPalette}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-border-primary bg-bg-elevated shadow-lg overlay-enter overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border-secondary px-4 py-3">
          <Search size={18} className="shrink-0 text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search commands, pages, articles..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-tertiary outline-none"
          />
          <kbd className="hidden sm:inline-flex rounded border border-border-primary bg-bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-text-tertiary">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto p-2">
          {flatFiltered.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-tertiary">
              No results found
            </div>
          ) : (
            <>
              {renderSection("Navigation", groupedItems.nav, navStart)}
              {renderSection("Tools", groupedItems.tools, toolsStart)}
              {renderSection("Recent Articles", groupedItems.articles, articlesStart)}
            </>
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 border-t border-border-secondary px-4 py-2 text-[11px] text-text-tertiary">
          <span className="flex items-center gap-1">
            <ArrowUp size={10} />
            <ArrowDown size={10} />
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft size={10} />
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border-primary bg-bg-secondary px-1 text-[10px] font-mono">
              Esc
            </kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
}
