"use client";

import { useEffect, useCallback, useRef } from "react";
import { useFeedNavigationStore } from "@/lib/store";

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
  onCloseReader: () => void;
  onShowHelp: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onNavigateNext,
  onNavigatePrev,
  onSave,
  onExpand,
  onCloseReader,
  onShowHelp,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const handlerRef = useRef<(e: KeyboardEvent) => void>(undefined);

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

      switch (e.key) {
        case "j":
        case "J":
          e.preventDefault();
          onNavigateNext();
          break;
        case "k":
        case "K":
          e.preventDefault();
          onNavigatePrev();
          break;
        case "s":
        case "S":
          e.preventDefault();
          onSave();
          break;
        case "Enter":
          e.preventDefault();
          onExpand();
          break;
        case "Escape":
          e.preventDefault();
          onCloseReader();
          break;
        case "?":
          e.preventDefault();
          onShowHelp();
          break;
      }
    },
    [onNavigateNext, onNavigatePrev, onSave, onExpand, onCloseReader, onShowHelp]
  );

  handlerRef.current = handleKeyDown;

  useEffect(() => {
    if (!enabled) return;

    const listener = (e: KeyboardEvent) => handlerRef.current?.(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [enabled]);
}

export const SHORTCUT_LIST = [
  { key: "J", description: "Next article" },
  { key: "K", description: "Previous article" },
  { key: "S", description: "Save / unsave article" },
  { key: "Enter", description: "Expand / collapse article" },
  { key: "Esc", description: "Close reader view" },
  { key: "?", description: "Show keyboard shortcuts" },
];
