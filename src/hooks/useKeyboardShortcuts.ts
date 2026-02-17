"use client";

import { useEffect, useCallback } from "react";

export interface KeyboardAction {
  key: string;
  label: string;
  description: string;
  handler: () => void;
  requiresFocus?: boolean;
}

interface UseKeyboardShortcutsOptions {
  onNavigateNext: () => void;
  onNavigatePrev: () => void;
  onSave: () => void;
  onExpand: () => void;
  onOpenSourceUrl: () => void;
  onCloseReader: () => void;
  onShowHelp: () => void;
  onDismiss?: () => void;
  onToggleBriefing?: () => void;
  onOpenSearch?: () => void;
  onOpenChat?: () => void;
  onMarkRead?: () => void;
  onJumpToSection?: (index: number) => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onNavigateNext,
  onNavigatePrev,
  onSave,
  onExpand,
  onOpenSourceUrl,
  onCloseReader,
  onShowHelp,
  onDismiss,
  onToggleBriefing,
  onOpenSearch,
  onOpenChat,
  onMarkRead,
  onJumpToSection,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        // Only handle Escape in inputs
        if (e.key === "Escape") {
          (target as HTMLInputElement).blur();
        }
        return;
      }

      // Cmd/Ctrl+K — command palette (let CommandPalette handle it, but don't block)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        return; // CommandPalette has its own listener
      }

      switch (e.key) {
        case "j":
        case "J":
        case "ArrowDown":
          e.preventDefault();
          onNavigateNext();
          break;
        case "k":
        case "K":
        case "ArrowUp":
          e.preventDefault();
          onNavigatePrev();
          break;
        case "s":
        case "S":
          e.preventDefault();
          onSave();
          break;
        case "Enter":
        case "ArrowRight":
          e.preventDefault();
          onExpand();
          break;
        case "Escape":
        case "ArrowLeft":
          e.preventDefault();
          onCloseReader();
          break;
        case "o":
        case "O":
          e.preventDefault();
          onOpenSourceUrl();
          break;
        case "x":
        case "X":
          e.preventDefault();
          onDismiss?.();
          break;
        case "b":
        case "B":
          e.preventDefault();
          onToggleBriefing?.();
          break;
        case "?":
          e.preventDefault();
          onShowHelp();
          break;
        case "/":
          e.preventDefault();
          onOpenSearch?.();
          break;
        case "c":
        case "C":
          e.preventDefault();
          onOpenChat?.();
          break;
        case "m":
        case "M":
          e.preventDefault();
          onMarkRead?.();
          break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
          e.preventDefault();
          onJumpToSection?.(parseInt(e.key));
          break;
      }
    },
    [onNavigateNext, onNavigatePrev, onSave, onExpand, onOpenSourceUrl, onCloseReader, onShowHelp, onDismiss, onToggleBriefing, onOpenSearch, onOpenChat, onMarkRead, onJumpToSection]
  );

  useEffect(() => {
    if (!enabled) return;

    const listener = (e: KeyboardEvent) => handleKeyDown(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [enabled, handleKeyDown]);
}

export interface ShortcutSection {
  title: string;
  shortcuts: { key: string; description: string }[];
}

export const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: "Navigation",
    shortcuts: [
      { key: "J / ↓", description: "Next article" },
      { key: "K / ↑", description: "Previous article" },
      { key: "→ / Enter", description: "Open article panel" },
      { key: "← / Esc", description: "Close panel" },
      { key: "1–5", description: "Jump to sidebar section" },
      { key: "/", description: "Search" },
      { key: "⌘K", description: "Command palette" },
    ],
  },
  {
    title: "Reading",
    shortcuts: [
      { key: "S", description: "Save / unsave article" },
      { key: "X", description: "Dismiss article" },
      { key: "O", description: "Open source in new tab" },
      { key: "M", description: "Mark article as read" },
    ],
  },
  {
    title: "Tools",
    shortcuts: [
      { key: "B", description: "Briefing mode" },
      { key: "C", description: "AI Chat" },
      { key: "?", description: "Keyboard shortcuts" },
    ],
  },
];

// Flat list for backward compat
export const SHORTCUT_LIST = SHORTCUT_SECTIONS.flatMap((s) => s.shortcuts);
