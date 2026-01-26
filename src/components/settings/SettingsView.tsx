"use client";

import { Settings, Palette, Bell, Database, User, Loader2, Brain, DollarSign, SlidersHorizontal, Save } from "lucide-react";
import { useThemeStore } from "@/lib/store";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useGmailStatus } from "@/hooks/useGmailStatus";
import { useAIUsage } from "@/hooks/useAIUsage";
import { usePreferences } from "@/hooks/usePreferences";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { useToastStore } from "@/components/ui/Toast";
import { topicLabels } from "@/lib/mock-data";
import type { TopicCategory, InterestLevel } from "@/types";

const interestLevels: { value: InterestLevel; label: string; color: string }[] = [
  { value: "high", label: "High", color: "text-accent-success" },
  { value: "medium", label: "Medium", color: "text-accent-primary" },
  { value: "low", label: "Low", color: "text-accent-warning" },
  { value: "hidden", label: "Hidden", color: "text-text-tertiary" },
];

export function SettingsView() {
  const { theme } = useThemeStore();
  const gmail = useGmailStatus();
  const ai = useAIUsage();
  const prefs = usePreferences();
  const sw = useServiceWorker();
  const { addToast } = useToastStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings size={24} className="text-accent-primary" />
        <h2 className="text-2xl font-bold text-text-primary">Settings</h2>
      </div>

      {/* Theme */}
      <section className="rounded-xl border border-border-primary bg-bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Palette size={18} className="text-text-secondary" />
          <h3 className="font-semibold text-text-primary">Appearance</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">Theme</p>
              <p className="text-xs text-text-tertiary">
                Current: {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </section>

      {/* Topic Preferences */}
      <section className="rounded-xl border border-border-primary bg-bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-text-secondary" />
            <h3 className="font-semibold text-text-primary">
              Topic Preferences
            </h3>
          </div>
          {prefs.isDirty && (
            <button
              onClick={async () => {
                const ok = await prefs.save();
                addToast(
                  ok ? "Preferences saved" : "Failed to save preferences",
                  ok ? "success" : "error"
                );
              }}
              className="flex items-center gap-1.5 rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors"
            >
              <Save size={14} />
              Save
            </button>
          )}
        </div>
        <p className="mb-3 text-xs text-text-tertiary">
          Set your interest level for each topic. &ldquo;Hidden&rdquo; topics
          won&apos;t appear in Priority Feed.
        </p>
        <div className="space-y-2">
          {(Object.entries(topicLabels) as [TopicCategory, string][]).map(
            ([topic, label]) => (
              <div
                key={topic}
                className="flex items-center justify-between rounded-lg bg-bg-secondary px-3 py-2"
              >
                <span className="text-sm text-text-primary">{label}</span>
                <div className="flex gap-1">
                  {interestLevels.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => prefs.setTopicLevel(topic, level.value)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        prefs.preferences[topic] === level.value
                          ? `bg-accent-primary text-text-inverse`
                          : "text-text-tertiary hover:bg-bg-hover hover:text-text-secondary"
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </section>

      {/* Notifications */}
      <section className="rounded-xl border border-border-primary bg-bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Bell size={18} className="text-text-secondary" />
          <h3 className="font-semibold text-text-primary">Notifications</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">
                Browser Notifications
              </p>
              <p className="text-xs text-text-tertiary">
                {sw.notificationsEnabled
                  ? "Enabled — you'll receive watchlist alerts"
                  : sw.isSupported
                    ? "Click to enable push notifications"
                    : "Not supported in this browser"}
              </p>
            </div>
            <button
              onClick={async () => {
                if (!sw.notificationsEnabled) {
                  const granted = await sw.requestNotificationPermission();
                  addToast(
                    granted
                      ? "Notifications enabled!"
                      : "Notification permission denied",
                    granted ? "success" : "error"
                  );
                }
              }}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                sw.notificationsEnabled ? "bg-accent-primary" : "bg-bg-tertiary"
              }`}
              role="switch"
              aria-checked={sw.notificationsEnabled}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full transition-transform ${
                  sw.notificationsEnabled
                    ? "left-6 bg-white"
                    : "left-1 bg-text-tertiary"
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">Service Worker</p>
              <p className="text-xs text-text-tertiary">
                {sw.isRegistered
                  ? "Active — offline mode available"
                  : "Not registered"}
              </p>
            </div>
            <span
              className={`h-2 w-2 rounded-full ${
                sw.isRegistered ? "bg-accent-success" : "bg-text-tertiary"
              }`}
            />
          </div>
        </div>
      </section>

      {/* Connected accounts */}
      <section className="rounded-xl border border-border-primary bg-bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <User size={18} className="text-text-secondary" />
          <h3 className="font-semibold text-text-primary">
            Connected Accounts
          </h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border-secondary bg-bg-secondary p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">
                G
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Gmail</p>
                <p className="text-xs text-text-tertiary">
                  {gmail.isLoading
                    ? "Checking..."
                    : gmail.isConnected
                      ? "Connected"
                      : "Not connected"}
                </p>
              </div>
            </div>
            {gmail.isLoading ? (
              <Loader2 size={16} className="animate-spin text-text-tertiary" />
            ) : gmail.isConnected ? (
              <button
                onClick={gmail.disconnect}
                className="rounded-lg border border-accent-danger/30 px-3 py-1.5 text-xs font-medium text-accent-danger transition-colors hover:bg-accent-danger/10"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={gmail.connect}
                className="rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-medium text-text-inverse transition-colors hover:bg-accent-primary-hover"
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </section>

      {/* AI Usage & Cost Tracking */}
      <section className="rounded-xl border border-border-primary bg-bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Brain size={18} className="text-text-secondary" />
          <h3 className="font-semibold text-text-primary">
            AI Summarization
          </h3>
        </div>
        {ai.isLoading ? (
          <div className="flex items-center gap-2 text-text-tertiary">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-sm">Loading usage data...</span>
          </div>
        ) : !ai.configured ? (
          <div className="rounded-lg bg-bg-secondary p-3">
            <p className="text-sm text-text-secondary">
              Claude API is not configured. Set{" "}
              <code className="rounded bg-bg-tertiary px-1 py-0.5 text-xs">
                ANTHROPIC_API_KEY
              </code>{" "}
              in your .env.local file to enable AI summaries.
            </p>
          </div>
        ) : ai.usage ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-bg-secondary p-3 text-center">
                <p className="text-lg font-bold text-text-primary">
                  {ai.usage.callCount}
                </p>
                <p className="text-xs text-text-tertiary">API Calls Today</p>
              </div>
              <div className="rounded-lg bg-bg-secondary p-3 text-center">
                <p className="text-lg font-bold text-text-primary">
                  ${(ai.usage.costCents / 100).toFixed(2)}
                </p>
                <p className="text-xs text-text-tertiary">Cost Today</p>
              </div>
              <div className="rounded-lg bg-bg-secondary p-3 text-center">
                <p className="text-lg font-bold text-text-primary">
                  ${(ai.usage.budgetCents / 100).toFixed(2)}
                </p>
                <p className="text-xs text-text-tertiary">Daily Budget</p>
              </div>
              <div className="rounded-lg bg-bg-secondary p-3 text-center">
                <p
                  className={`text-lg font-bold ${
                    ai.usage.isOverBudget
                      ? "text-accent-danger"
                      : ai.usage.budgetUsedPercent > 75
                        ? "text-accent-warning"
                        : "text-accent-success"
                  }`}
                >
                  {ai.usage.budgetUsedPercent}%
                </p>
                <p className="text-xs text-text-tertiary">Budget Used</p>
              </div>
            </div>
            {/* Budget bar */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-text-tertiary">
                  <DollarSign size={12} />
                  Daily budget usage
                </span>
                {ai.usage.isOverBudget && (
                  <span className="text-xs font-medium text-accent-danger">
                    Over budget — summarization paused
                  </span>
                )}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-bg-tertiary">
                <div
                  className={`h-full rounded-full transition-all ${
                    ai.usage.isOverBudget
                      ? "bg-accent-danger"
                      : ai.usage.budgetUsedPercent > 75
                        ? "bg-accent-warning"
                        : "bg-accent-success"
                  }`}
                  style={{
                    width: `${Math.min(ai.usage.budgetUsedPercent, 100)}%`,
                  }}
                />
              </div>
            </div>
            <div className="text-xs text-text-tertiary">
              Tokens used: {ai.usage.inputTokens.toLocaleString()} input /{" "}
              {ai.usage.outputTokens.toLocaleString()} output
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-tertiary">No usage data yet.</p>
        )}
      </section>

      {/* System Status */}
      <section className="rounded-xl border border-border-primary bg-bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Database size={18} className="text-text-secondary" />
          <h3 className="font-semibold text-text-primary">System Status</h3>
        </div>
        <div className="space-y-2">
          <StatusRow
            label="Database (Supabase)"
            status={isSupabaseConfigured() ? "connected" : "not configured"}
          />
          <StatusRow
            label="Gmail API"
            status={
              gmail.isLoading
                ? "checking"
                : gmail.isConnected
                  ? "connected"
                  : "not connected"
            }
          />
          <StatusRow label="News APIs" status="available" />
          <StatusRow
            label="Claude API"
            status={
              ai.isLoading
                ? "checking"
                : ai.configured
                  ? "connected"
                  : "not configured"
            }
          />
        </div>
      </section>

      {/* Setup Instructions */}
      <section className="rounded-xl border border-border-primary bg-bg-card p-5">
        <h3 className="mb-3 font-semibold text-text-primary">
          Setup Instructions
        </h3>
        <div className="space-y-2 text-sm text-text-secondary">
          <p>
            <strong>1. Gmail:</strong> Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
            and GOOGLE_REDIRECT_URI in .env.local, then click Connect above.
          </p>
          <p>
            <strong>2. Supabase:</strong> Set NEXT_PUBLIC_SUPABASE_URL and
            NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. Run schema.sql in
            Supabase SQL Editor.
          </p>
          <p>
            <strong>3. Claude API:</strong> Set ANTHROPIC_API_KEY in .env.local
            (needed for Phase 5).
          </p>
          <p>
            <strong>4. News APIs:</strong> Set NEWS_API_KEY in .env.local
            (needed for Phase 4).
          </p>
        </div>
      </section>
    </div>
  );
}

function StatusRow({
  label,
  status,
}: {
  label: string;
  status: string;
}) {
  const colors: Record<string, string> = {
    connected: "bg-accent-success",
    available: "bg-accent-success",
    "not configured": "bg-accent-warning",
    "not connected": "bg-text-tertiary",
    checking: "bg-accent-warning animate-pulse",
  };

  return (
    <div className="flex items-center justify-between rounded-lg bg-bg-secondary px-3 py-2">
      <span className="text-sm text-text-secondary">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${colors[status] || "bg-text-tertiary"}`}
        />
        <span className="text-xs capitalize text-text-tertiary">{status}</span>
      </div>
    </div>
  );
}
