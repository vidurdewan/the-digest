"use client";

import { useState } from "react";
import { Loader2, DollarSign, Save, Star, X, Plus } from "lucide-react";
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
    <div>
      <h2 className="text-3xl font-serif font-bold text-text-primary mb-2">Settings</h2>

      {/* Theme */}
      <section className="border-b border-border-primary py-8">
        <h3 className="font-serif text-2xl font-bold text-text-primary mb-4">Appearance</h3>
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
      <section className="border-b border-border-primary py-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-2xl font-bold text-text-primary">
            Topic Preferences
          </h3>
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

      {/* VIP Newsletters */}
      <VipNewslettersSection prefs={prefs} addToast={addToast} />

      {/* Notifications */}
      <section className="border-b border-border-primary py-8">
        <h3 className="font-serif text-2xl font-bold text-text-primary mb-4">Notifications</h3>
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
      <section className="border-b border-border-primary py-8">
        <h3 className="font-serif text-2xl font-bold text-text-primary mb-4">
          Connected Accounts
        </h3>
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
      <section className="border-b border-border-primary py-8">
        <h3 className="font-serif text-2xl font-bold text-text-primary mb-4">
          AI Summarization
        </h3>
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
      <section className="border-b border-border-primary py-8">
        <h3 className="font-serif text-2xl font-bold text-text-primary mb-4">System Status</h3>
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
      <section className="py-8">
        <h3 className="font-serif text-2xl font-bold text-text-primary mb-4">
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

function VipNewslettersSection({
  prefs,
  addToast,
}: {
  prefs: ReturnType<typeof usePreferences>;
  addToast: (message: string, type: "success" | "error" | "info") => void;
}) {
  const [newVip, setNewVip] = useState("");

  const handleAdd = () => {
    const trimmed = newVip.trim();
    if (!trimmed) return;
    if (prefs.vipNewsletters.includes(trimmed)) {
      addToast("Already in VIP list", "info");
      return;
    }
    prefs.addVipNewsletter(trimmed);
    setNewVip("");
  };

  return (
    <section className="border-b border-border-primary py-8">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-2xl font-bold text-text-primary">VIP Newsletters</h3>
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
        These newsletters always get full-depth summaries and are featured in
        Today&apos;s Brief.
      </p>

      {/* Current VIP list */}
      <div className="mb-3 flex flex-wrap gap-2">
        {prefs.vipNewsletters.map((pub) => (
          <span
            key={pub}
            className="flex items-center gap-1.5 rounded-lg bg-accent-warning/10 px-3 py-1.5 text-sm font-medium text-accent-warning"
          >
            <Star size={12} />
            {pub}
            <button
              onClick={() => prefs.removeVipNewsletter(pub)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-accent-warning/20 transition-colors"
              aria-label={`Remove ${pub}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {prefs.vipNewsletters.length === 0 && (
          <span className="text-sm text-text-tertiary">
            No VIP newsletters configured.
          </span>
        )}
      </div>

      {/* Add new VIP */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newVip}
          onChange={(e) => setNewVip(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="Add publication name..."
          className="flex-1 rounded-lg border border-border-secondary bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={!newVip.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-accent-primary px-3 py-2 text-sm font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={14} />
          Add
        </button>
      </div>
    </section>
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
