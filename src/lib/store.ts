import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Theme, NavigationSection } from "@/types";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => set({ theme }),
    }),
    { name: "the-digest-theme" }
  )
);

interface SidebarState {
  isOpen: boolean;
  activeSection: string;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setActiveSection: (section: string) => void;
}

export const useSidebarStore = create<SidebarState>()((set) => ({
  isOpen: true,
  activeSection: "priority-feed",
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (open) => set({ isOpen: open }),
  setActiveSection: (section) => set({ activeSection: section }),
}));

interface FeedNavigationState {
  focusedIndex: number;
  totalItems: number;
  setFocusedIndex: (index: number) => void;
  setTotalItems: (count: number) => void;
  focusNext: () => void;
  focusPrev: () => void;
  reset: () => void;
}

export const useFeedNavigationStore = create<FeedNavigationState>()((set, get) => ({
  focusedIndex: -1,
  totalItems: 0,
  setFocusedIndex: (index) => set({ focusedIndex: index }),
  setTotalItems: (count) => set({ totalItems: count }),
  focusNext: () => {
    const { focusedIndex, totalItems } = get();
    if (totalItems === 0) return;
    set({ focusedIndex: Math.min(focusedIndex + 1, totalItems - 1) });
  },
  focusPrev: () => {
    const { focusedIndex } = get();
    set({ focusedIndex: Math.max(focusedIndex - 1, 0) });
  },
  reset: () => set({ focusedIndex: -1, totalItems: 0 }),
}));

export const navigationSections: NavigationSection[] = [
  { id: "priority-feed", label: "Priority Feed", icon: "Zap", path: "/" },
  {
    id: "newsletters",
    label: "Newsletters",
    icon: "Mail",
    path: "/newsletters",
  },
  { id: "news", label: "News by Topic", icon: "Newspaper", path: "/news" },
  {
    id: "watchlist",
    label: "Watchlist Alerts",
    icon: "Eye",
    path: "/watchlist",
  },
  {
    id: "people-moves",
    label: "People Moves",
    icon: "UserCheck",
    path: "/people-moves",
  },
  {
    id: "companies",
    label: "Company Intel",
    icon: "Building2",
    path: "/companies",
  },
  { id: "saved", label: "Saved", icon: "Bookmark", path: "/saved" },
  { id: "search", label: "Search", icon: "Search", path: "/search" },
  { id: "chat", label: "AI Chat", icon: "MessageSquare", path: "/chat" },
  { id: "brief", label: "Brief Me", icon: "FileText", path: "/brief" },
  { id: "weekly-synthesis", label: "Weekly Synthesis", icon: "BookOpen", path: "/weekly-synthesis" },
  { id: "sources", label: "Sources", icon: "Rss", path: "/sources" },
  { id: "settings", label: "Settings", icon: "Settings", path: "/settings" },
];
