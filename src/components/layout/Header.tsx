"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSidebarStore, useThemeStore, useReadStateStore } from "@/lib/store";
import {
  Bell,
  Sun,
  Moon,
  Newspaper,
  Check,
  Rss,
  Eye,
  Mail,
  Menu,
  X,
  CheckCheck,
  RefreshCw,
  Loader2,
} from "lucide-react";
import type { Theme, Article, Newsletter } from "@/types";

// Theme swatch previews — uses CSS custom properties
const themeSwatchVars: Record<Theme, string> = {
  light: "var(--theme-swatch-light)",
  dark: "var(--theme-swatch-dark)",
  newspaper: "var(--theme-swatch-newspaper)",
};

const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: "light", label: "Light", icon: <Sun size={14} /> },
  { value: "dark", label: "Dark", icon: <Moon size={14} /> },
  { value: "newspaper", label: "Paper", icon: <Newspaper size={14} /> },
];

interface NotificationItem {
  id: string;
  icon: React.ReactNode;
  message: string;
  time: string;
  articleId?: string;
}

function getRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function buildNotifications(
  articles?: Article[],
  newsletters?: Newsletter[]
): NotificationItem[] {
  const cutoff = Date.now() - 4 * 60 * 60 * 1000;
  const items: NotificationItem[] = [];

  if (articles) {
    const recentBySource = new Map<string, Article[]>();
    for (const a of articles) {
      const pubDate = new Date(a.publishedAt).getTime();
      if (pubDate >= cutoff) {
        const existing = recentBySource.get(a.source) || [];
        existing.push(a);
        recentBySource.set(a.source, existing);
      }
    }

    for (const [source, sourceArticles] of recentBySource) {
      const latest = sourceArticles.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      )[0];
      items.push({
        id: `source-${source}`,
        icon: <Rss size={14} className="text-accent-primary" />,
        message: `${sourceArticles.length} new article${sourceArticles.length > 1 ? "s" : ""} from ${source}`,
        time: getRelativeTime(new Date(latest.publishedAt)),
        articleId: latest.id,
      });
    }

    const watchlistArticles = articles.filter(
      (a) =>
        a.watchlistMatches.length > 0 &&
        new Date(a.publishedAt).getTime() >= cutoff
    );
    for (const a of watchlistArticles.slice(0, 3)) {
      items.push({
        id: `watchlist-${a.id}`,
        icon: <Eye size={14} className="text-accent-warning" />,
        message: `Watchlist match: "${a.title.slice(0, 50)}${a.title.length > 50 ? "..." : ""}"`,
        time: getRelativeTime(new Date(a.publishedAt)),
        articleId: a.id,
      });
    }
  }

  if (newsletters) {
    const recentNewsletters = newsletters.filter(
      (n) => new Date(n.receivedAt).getTime() >= cutoff
    );
    if (recentNewsletters.length > 0) {
      const latest = recentNewsletters.sort(
        (a, b) =>
          new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      )[0];
      items.push({
        id: "newsletters-recent",
        icon: <Mail size={14} className="text-accent-success" />,
        message: `${recentNewsletters.length} new newsletter${recentNewsletters.length > 1 ? "s" : ""}`,
        time: getRelativeTime(new Date(latest.receivedAt)),
      });
    }
  }

  return items.slice(0, 10);
}

// Nav link definitions for the editorial header
interface NavLink {
  id: string;
  label: string;
  section: string;
}

const NAV_LINKS: NavLink[] = [
  { id: "feed", label: "Your Feed", section: "priority-feed" },
  { id: "newsletters", label: "Newsletters", section: "newsletters" },
  { id: "saved", label: "Saved", section: "saved" },
  { id: "settings", label: "Settings", section: "settings" },
];

export interface EditorialHeaderProps {
  articles?: Article[];
  newsletters?: Newsletter[];
  onNavigateToArticle?: (articleId: string) => void;
  unreadNewsletterCount?: number;
  onMarkAllRead?: (articleIds: string[]) => void;
  onForceRefresh?: () => void;
  isRefreshing?: boolean;
}

export function EditorialHeader({
  articles,
  newsletters,
  onNavigateToArticle,
  unreadNewsletterCount = 0,
  onMarkAllRead,
  onForceRefresh,
  isRefreshing,
}: EditorialHeaderProps) {
  const { activeSection, setActiveSection } = useSidebarStore();
  const { theme, setTheme } = useThemeStore();
  const readArticleIds = useReadStateStore((s) => s.readArticleIds);
  const readNewsletterIds = useReadStateStore((s) => s.readNewsletterIds);
  const [themeOpen, setThemeOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const notifications = buildNotifications(articles, newsletters);
  const unreadCount = notifications.filter((n) => !readNotifIds.has(n.id)).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setThemeOpen(false);
        setNotifOpen(false);
      }
    };
    if (themeOpen || notifOpen) {
      document.addEventListener("keydown", handler);
      return () => document.removeEventListener("keydown", handler);
    }
  }, [themeOpen, notifOpen]);

  const handleSelectTheme = useCallback(
    (t: Theme) => {
      setTheme(t);
      setThemeOpen(false);
    },
    [setTheme]
  );

  const handleOpenNotif = useCallback(() => {
    setNotifOpen((prev) => {
      if (!prev) {
        setReadNotifIds(new Set(notifications.map((n) => n.id)));
      }
      return !prev;
    });
    setThemeOpen(false);
  }, [notifications]);

  const handleNotifClick = useCallback(
    (notif: NotificationItem) => {
      if (notif.articleId && onNavigateToArticle) {
        onNavigateToArticle(notif.articleId);
        setNotifOpen(false);
      }
    },
    [onNavigateToArticle]
  );

  const handleNavClick = (section: string) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  };

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [mobileMenuOpen]);

  return (
    <>
    <header className="editorial-header sticky top-0 z-50 w-full border-b border-border-primary bg-bg-primary transition-theme">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 md:px-8 py-4">
        {/* Left: App name */}
        <h1 className="font-serif text-xl font-bold text-text-primary underline underline-offset-4 decoration-1">
          The Digest
        </h1>

        {/* Right: Nav links + theme + notifications + hamburger */}
        <div className="flex items-center gap-6">
          {/* Nav links — hidden below lg */}
          <nav className="hidden items-center gap-5 lg:flex">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.section;
              // Compute unread newsletter count including Zustand state
              const nlUnread = link.id === "newsletters" && newsletters
                ? newsletters.filter((n) => !n.isRead && !readNewsletterIds.includes(n.id)).length
                : 0;
              const label =
                link.id === "newsletters" && nlUnread > 0
                  ? `Newsletters (${nlUnread} new)`
                  : link.label;

              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.section)}
                  className={`typo-nav transition-colors ${
                    isActive
                      ? "font-semibold text-text-primary underline underline-offset-4"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Progress indicator */}
          {activeSection === "priority-feed" && articles && articles.length > 0 && (() => {
            const totalArticles = articles.length;
            const readCount = articles.filter(
              (a) => a.isRead || readArticleIds.includes(a.id)
            ).length;
            const allRead = readCount >= totalArticles;
            return (
              <div className="hidden lg:flex items-center gap-2 text-xs">
                {allRead ? (
                  <span className="flex items-center gap-1 text-accent-success font-medium">
                    <Check size={13} />
                    Caught up
                  </span>
                ) : (
                  <span className="text-text-tertiary">
                    {readCount} of {totalArticles} stories
                  </span>
                )}
              </div>
            );
          })()}

          {/* Feed actions — only show on priority-feed */}
          {activeSection === "priority-feed" && (
            <div className="hidden lg:flex items-center gap-3">
              {onMarkAllRead && articles && (
                <button
                  onClick={() => onMarkAllRead(articles.map((a) => a.id))}
                  className="text-xs uppercase tracking-wide text-text-secondary hover:text-text-primary transition-colors"
                >
                  Mark All Read
                </button>
              )}
              {onForceRefresh && (
                <button
                  onClick={onForceRefresh}
                  disabled={isRefreshing}
                  className="text-xs uppercase tracking-wide text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                >
                  {isRefreshing ? (
                    <span className="flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" />
                      Refreshing
                    </span>
                  ) : (
                    "Refresh"
                  )}
                </button>
              )}
            </div>
          )}

          {/* Separator */}
          <div className="hidden h-5 w-px bg-border-secondary lg:block" />

          {/* Theme switcher dropdown */}
          <div ref={themeRef} className="relative">
            <button
              onClick={() => {
                setThemeOpen(!themeOpen);
                setNotifOpen(false);
              }}
              className="rounded-lg p-2 text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors"
              aria-label={`Theme: ${themeOptions.find((t) => t.value === theme)?.label}`}
              title="Switch theme"
            >
              {themeOptions.find((t) => t.value === theme)?.icon}
            </button>
            {themeOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-border-primary bg-bg-elevated py-1 shadow-lg z-50">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelectTheme(opt.value)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-bg-hover"
                  >
                    <span
                      className="h-5 w-5 rounded-full border border-border-primary shrink-0"
                      style={{ backgroundColor: themeSwatchVars[opt.value] }}
                    />
                    <span className="flex items-center gap-1.5">
                      {opt.icon}
                      <span
                        className={`text-xs font-medium ${
                          theme === opt.value
                            ? "text-text-primary"
                            : "text-text-secondary"
                        }`}
                      >
                        {opt.label}
                      </span>
                    </span>
                    {theme === opt.value && (
                      <Check
                        size={14}
                        className="ml-auto text-accent-primary shrink-0"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={handleOpenNotif}
              className="relative rounded-lg p-2 text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors"
              aria-label="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-danger px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-[360px] rounded-xl border border-border-primary bg-bg-card shadow-lg z-50 overflow-hidden">
                <div className="border-b border-border-secondary px-4 py-3">
                  <h4 className="text-sm font-semibold text-text-primary">
                    Notifications
                  </h4>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    <div className="py-1">
                      {notifications.map((notif) => (
                        <button
                          key={notif.id}
                          onClick={() => handleNotifClick(notif)}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-hover ${
                            notif.articleId
                              ? "cursor-pointer"
                              : "cursor-default"
                          }`}
                        >
                          <span className="mt-0.5 shrink-0">{notif.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-text-primary leading-relaxed">
                              {notif.message}
                            </p>
                            <p className="mt-0.5 text-[10px] text-text-tertiary">
                              {notif.time}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <Bell
                        size={24}
                        className="mx-auto mb-2 text-text-tertiary"
                      />
                      <p className="text-xs text-text-tertiary leading-relaxed">
                        No new notifications.
                        <br />
                        Watchlist alerts and breaking news will appear here.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Hamburger — visible below lg */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-lg p-2 text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>
    </header>

    {/* Full-screen mobile nav overlay */}
    {mobileMenuOpen && (
      <div className="fixed inset-0 z-[60] bg-bg-primary flex flex-col items-center justify-center lg:hidden mobile-menu-enter">
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="absolute top-4 right-4 rounded-lg p-2 text-text-tertiary hover:text-text-primary transition-colors"
          aria-label="Close menu"
        >
          <X size={24} />
        </button>
        <nav className="flex flex-col items-center gap-8">
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.section;
            return (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.section)}
                className={`text-3xl font-serif font-bold transition-colors ${
                  isActive
                    ? "text-accent-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>
      </div>
    )}
    </>
  );
}

// Keep old exports for backward compat during transition
export type HeaderProps = EditorialHeaderProps;
export const Header = EditorialHeader;
