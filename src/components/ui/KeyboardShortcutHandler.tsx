"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Keyboard } from "lucide-react";
import { useFeedNavigationStore } from "@/lib/store";
import { useKeyboardShortcuts, SHORTCUT_LIST } from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutHandlerProps {
  onSaveFocused?: () => void;
  onExpandFocused?: () => void;
  onCloseReader?: () => void;
}

export function KeyboardShortcutHandler({
  onSaveFocused,
  onExpandFocused,
  onCloseReader,
}: KeyboardShortcutHandlerProps) {
  const [showHelp, setShowHelp] = useState(false);
  const { focusedIndex, focusNext, focusPrev } = useFeedNavigationStore();

  // Scroll focused element into view
  useEffect(() => {
    if (focusedIndex < 0) return;

    const elements = document.querySelectorAll("[data-feed-index]");
    const el = elements[focusedIndex] as HTMLElement | undefined;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });

      // Add/remove focus ring
      elements.forEach((e) => e.classList.remove("ring-2", "ring-accent-primary", "ring-offset-2"));
      el.classList.add("ring-2", "ring-accent-primary", "ring-offset-2");
    }
  }, [focusedIndex]);

  // Clean up focus rings on unmount
  useEffect(() => {
    return () => {
      document.querySelectorAll("[data-feed-index]").forEach((e) =>
        e.classList.remove("ring-2", "ring-accent-primary", "ring-offset-2")
      );
    };
  }, []);

  const handleNavigateNext = useCallback(() => {
    const total = document.querySelectorAll("[data-feed-index]").length;
    useFeedNavigationStore.getState().setTotalItems(total);
    focusNext();
  }, [focusNext]);

  const handleNavigatePrev = useCallback(() => {
    focusPrev();
  }, [focusPrev]);

  const handleSave = useCallback(() => {
    if (focusedIndex >= 0) {
      onSaveFocused?.();
    }
  }, [focusedIndex, onSaveFocused]);

  const handleExpand = useCallback(() => {
    if (focusedIndex >= 0) {
      onExpandFocused?.();
    }
  }, [focusedIndex, onExpandFocused]);

  const handleCloseReader = useCallback(() => {
    onCloseReader?.();
  }, [onCloseReader]);

  const handleShowHelp = useCallback(() => {
    setShowHelp((prev) => !prev);
  }, []);

  useKeyboardShortcuts({
    onNavigateNext: handleNavigateNext,
    onNavigatePrev: handleNavigatePrev,
    onSave: handleSave,
    onExpand: handleExpand,
    onCloseReader: handleCloseReader,
    onShowHelp: handleShowHelp,
  });

  if (!showHelp) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-xl border border-border-primary bg-bg-primary p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-accent-primary" />
            <h3 className="text-lg font-semibold text-text-primary">
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={() => setShowHelp(false)}
            className="rounded-md p-1 text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          {SHORTCUT_LIST.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-bg-secondary transition-colors"
            >
              <span className="text-sm text-text-secondary">
                {shortcut.description}
              </span>
              <kbd className="rounded-md border border-border-primary bg-bg-secondary px-2 py-0.5 text-xs font-mono font-medium text-text-primary">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-text-tertiary">
          Press <kbd className="rounded border border-border-primary bg-bg-secondary px-1 py-0.5 text-[10px] font-mono">?</kbd> to toggle this help
        </p>
      </div>
    </div>
  );
}
