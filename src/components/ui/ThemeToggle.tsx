"use client";

import { useThemeStore } from "@/lib/store";
import { Sun, Moon, Newspaper } from "lucide-react";
import type { Theme } from "@/types";

const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: "light", label: "Light", icon: <Sun size={16} /> },
  { value: "dark", label: "Dark", icon: <Moon size={16} /> },
  { value: "newspaper", label: "Paper", icon: <Newspaper size={16} /> },
];

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="flex items-center gap-1 rounded-lg bg-bg-tertiary p-1 transition-theme">
      {themes.map((t) => (
        <button
          key={t.value}
          onClick={() => setTheme(t.value)}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
            theme === t.value
              ? "bg-bg-card text-text-primary shadow-sm"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
          aria-label={`Switch to ${t.label} theme`}
        >
          {t.icon}
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
