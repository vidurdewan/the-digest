"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "the-digest-shortcut-hint-seen";

export function ShortcutHintToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Show after a brief delay
    const showTimer = setTimeout(() => setVisible(true), 1000);

    // Auto-dismiss after 5s
    const hideTimer = setTimeout(() => {
      dismiss();
    }, 6000);

    // Dismiss on any keypress
    const onKey = () => dismiss();
    window.addEventListener("keydown", onKey, { once: true });

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
  }

  if (!visible) return null;

  return (
    <div className="shortcut-hint-toast" onClick={dismiss}>
      <span>
        Press{" "}
        <kbd className="rounded border border-border-primary bg-bg-secondary px-1.5 py-0.5 text-[11px] font-mono font-medium">
          ?
        </kbd>{" "}
        for keyboard shortcuts · Press{" "}
        <kbd className="rounded border border-border-primary bg-bg-secondary px-1.5 py-0.5 text-[11px] font-mono font-medium">
          B
        </kbd>{" "}
        for briefing mode
      </span>
    </div>
  );
}
