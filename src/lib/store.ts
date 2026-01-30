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

// Navigation with grouped sections
export interface NavGroup {
  label: string;
  items: NavigationSection[];
}

export const navigationGroups: NavGroup[] = [
  {
    label: "Feed",
    items: [
      { id: "priority-feed", label: "Priority Feed", icon: "Zap", path: "/" },
      { id: "newsletters", label: "Newsletters", icon: "Mail", path: "/newsletters" },
      { id: "news", label: "News by Topic", icon: "Newspaper", path: "/news" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { id: "intelligence", label: "Intelligence", icon: "Radar", path: "/intelligence" },
    ],
  },
  {
    label: "Tools",
    items: [
      { id: "search", label: "Search", icon: "Search", path: "/search" },
      { id: "chat", label: "AI Chat", icon: "MessageSquare", path: "/chat" },
      { id: "brief", label: "Brief Me", icon: "FileText", path: "/brief" },
      { id: "weekly-synthesis", label: "Weekly Synthesis", icon: "BookOpen", path: "/weekly-synthesis" },
      { id: "saved", label: "Saved", icon: "Bookmark", path: "/saved" },
    ],
  },
];

export const bottomNavSections: NavigationSection[] = [
  { id: "sources", label: "Sources", icon: "Rss", path: "/sources" },
  { id: "settings", label: "Settings", icon: "Settings", path: "/settings" },
];

// Flat list for backward compat
export const navigationSections: NavigationSection[] = [
  ...navigationGroups.flatMap((g) => g.items),
  ...bottomNavSections,
];

// ─── Read State (client-side, localStorage-persisted) ─────────
interface ReadStateState {
  readArticleIds: string[];
  readNewsletterIds: string[];
  digestReadToday: boolean; // true if daily digest was opened today
  markArticleRead: (id: string) => void;
  markNewsletterRead: (id: string) => void;
  markDigestRead: () => void;
  isArticleRead: (id: string) => boolean;
  isNewsletterRead: (id: string) => boolean;
  resetDaily: () => void;
}

export const useReadStateStore = create<ReadStateState>()(
  persist(
    (set, get) => ({
      readArticleIds: [],
      readNewsletterIds: [],
      digestReadToday: false,
      markArticleRead: (id) =>
        set((state) => {
          if (state.readArticleIds.includes(id)) return state;
          return { readArticleIds: [...state.readArticleIds, id] };
        }),
      markNewsletterRead: (id) =>
        set((state) => {
          if (state.readNewsletterIds.includes(id)) return state;
          return { readNewsletterIds: [...state.readNewsletterIds, id] };
        }),
      markDigestRead: () => set({ digestReadToday: true }),
      isArticleRead: (id) => get().readArticleIds.includes(id),
      isNewsletterRead: (id) => get().readNewsletterIds.includes(id),
      resetDaily: () => set({ digestReadToday: false }),
    }),
    { name: "the-digest-read-state" }
  )
);

// ─── Reading Patterns (source/topic frequency tracking) ──────
interface ReadingPatternsState {
  sourceReadCounts: Record<string, number>;
  topicReadCounts: Record<string, number>;
  recordRead: (source: string, topic: string) => void;
}

export const useReadingPatternsStore = create<ReadingPatternsState>()(
  persist(
    (set) => ({
      sourceReadCounts: {},
      topicReadCounts: {},
      recordRead: (source, topic) =>
        set((s) => ({
          sourceReadCounts: {
            ...s.sourceReadCounts,
            [source]: (s.sourceReadCounts[source] ?? 0) + 1,
          },
          topicReadCounts: {
            ...s.topicReadCounts,
            [topic]: (s.topicReadCounts[topic] ?? 0) + 1,
          },
        })),
    }),
    { name: "the-digest-reading-patterns" }
  )
);

// ─── Overlay / Panel state ────────────────────────────────────
interface OverlayState {
  commandPaletteOpen: boolean;
  searchOverlayOpen: boolean;
  chatPanelOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  openSearchOverlay: () => void;
  closeSearchOverlay: () => void;
  toggleSearchOverlay: () => void;
  openChatPanel: () => void;
  closeChatPanel: () => void;
  toggleChatPanel: () => void;
}

export const useOverlayStore = create<OverlayState>()((set) => ({
  commandPaletteOpen: false,
  searchOverlayOpen: false,
  chatPanelOpen: false,
  openCommandPalette: () =>
    set({ commandPaletteOpen: true, searchOverlayOpen: false }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleCommandPalette: () =>
    set((s) => ({
      commandPaletteOpen: !s.commandPaletteOpen,
      searchOverlayOpen: false,
    })),
  openSearchOverlay: () =>
    set({ searchOverlayOpen: true, commandPaletteOpen: false }),
  closeSearchOverlay: () => set({ searchOverlayOpen: false }),
  toggleSearchOverlay: () =>
    set((s) => ({
      searchOverlayOpen: !s.searchOverlayOpen,
      commandPaletteOpen: false,
    })),
  openChatPanel: () => set({ chatPanelOpen: true }),
  closeChatPanel: () => set({ chatPanelOpen: false }),
  toggleChatPanel: () => set((s) => ({ chatPanelOpen: !s.chatPanelOpen })),
}));
