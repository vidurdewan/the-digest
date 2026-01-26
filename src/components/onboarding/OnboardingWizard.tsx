"use client";

import { useState } from "react";
import {
  Zap,
  Mail,
  Eye,
  Brain,
  Bell,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
} from "lucide-react";
import type { TopicCategory, InterestLevel } from "@/types";
import { topicLabels } from "@/lib/mock-data";

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
}

export interface OnboardingData {
  topicPreferences: Record<TopicCategory, InterestLevel>;
  watchlistItems: string[];
  notificationsEnabled: boolean;
}

const steps = [
  {
    icon: Zap,
    title: "Welcome to The Digest",
    subtitle: "Your personal intelligence dashboard",
  },
  {
    icon: Eye,
    title: "Set Your Interests",
    subtitle: "Choose topics that matter to you",
  },
  {
    icon: Mail,
    title: "Watchlist Setup",
    subtitle: "Track companies, people, and keywords",
  },
  {
    icon: Bell,
    title: "Notifications",
    subtitle: "Stay updated with real-time alerts",
  },
  {
    icon: Brain,
    title: "You're All Set!",
    subtitle: "Start exploring your personalized feed",
  },
];

export function OnboardingWizard({
  onComplete,
  onSkip,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState<
    Record<TopicCategory, InterestLevel>
  >({
    "vc-startups": "high",
    "fundraising-acquisitions": "high",
    "executive-movements": "high",
    "financial-markets": "medium",
    geopolitics: "medium",
    automotive: "medium",
    "science-tech": "medium",
    "local-news": "low",
    politics: "medium",
  });
  const [watchlistInput, setWatchlistInput] = useState("");
  const [watchlistItems, setWatchlistItems] = useState<string[]>([
    "Sequoia Capital",
    "Andreessen Horowitz",
  ]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete({
        topicPreferences: preferences,
        watchlistItems,
        notificationsEnabled,
      });
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const addWatchlistItem = () => {
    if (watchlistInput.trim() && !watchlistItems.includes(watchlistInput.trim())) {
      setWatchlistItems([...watchlistItems, watchlistInput.trim()]);
      setWatchlistInput("");
    }
  };

  const removeWatchlistItem = (item: string) => {
    setWatchlistItems(watchlistItems.filter((i) => i !== item));
  };

  const requestNotifications = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === "granted");
    }
  };

  const StepIcon = steps[step].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-primary px-6 py-4">
          <div className="flex items-center gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  i <= step ? "bg-accent-primary" : "bg-bg-tertiary"
                }`}
              />
            ))}
          </div>
          <button
            onClick={onSkip}
            className="text-xs text-text-tertiary hover:text-text-secondary"
          >
            Skip
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/10">
              <StepIcon size={24} className="text-accent-primary" />
            </div>
            <h2 className="text-xl font-bold text-text-primary">
              {steps[step].title}
            </h2>
            <p className="mt-1 text-sm text-text-tertiary">
              {steps[step].subtitle}
            </p>
          </div>

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="space-y-3 text-sm text-text-secondary">
              <p>
                The Digest aggregates news from multiple sources, summarizes it
                with AI, and helps you stay on top of what matters most.
              </p>
              <div className="space-y-2 rounded-lg bg-bg-secondary p-4">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-accent-success" />
                  <span>AI-powered summaries of every article</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-accent-success" />
                  <span>Watchlist alerts for companies and people</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-accent-success" />
                  <span>Personalized priority feed</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-accent-success" />
                  <span>Executive movement tracking</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Topic Preferences */}
          {step === 1 && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {(Object.entries(topicLabels) as [TopicCategory, string][]).map(
                ([topic, label]) => (
                  <div
                    key={topic}
                    className="flex items-center justify-between rounded-lg bg-bg-secondary px-3 py-2"
                  >
                    <span className="text-sm text-text-primary">{label}</span>
                    <div className="flex gap-1">
                      {(["high", "medium", "low", "hidden"] as InterestLevel[]).map(
                        (level) => (
                          <button
                            key={level}
                            onClick={() =>
                              setPreferences({
                                ...preferences,
                                [topic]: level,
                              })
                            }
                            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                              preferences[topic] === level
                                ? "bg-accent-primary text-text-inverse"
                                : "text-text-tertiary hover:bg-bg-hover"
                            }`}
                          >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* Step 2: Watchlist */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={watchlistInput}
                  onChange={(e) => setWatchlistInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addWatchlistItem()}
                  placeholder="Add a company, person, or keyword..."
                  className="flex-1 rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-accent-primary"
                />
                <button
                  onClick={addWatchlistItem}
                  className="rounded-lg bg-accent-primary px-3 py-2 text-sm font-medium text-text-inverse"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {watchlistItems.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-1.5 rounded-full border border-border-primary bg-bg-secondary px-3 py-1.5 text-sm"
                  >
                    <span className="text-text-primary">{item}</span>
                    <button
                      onClick={() => removeWatchlistItem(item)}
                      className="text-text-tertiary hover:text-accent-danger"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              {watchlistItems.length === 0 && (
                <p className="text-xs text-text-tertiary">
                  Add companies, funds, people, or keywords to track.
                </p>
              )}
            </div>
          )}

          {/* Step 3: Notifications */}
          {step === 3 && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-text-secondary">
                Get notified when articles match your watchlist or when
                important stories break.
              </p>
              {notificationsEnabled ? (
                <div className="flex items-center justify-center gap-2 rounded-lg bg-accent-success/10 p-3 text-sm text-accent-success">
                  <Check size={16} />
                  Notifications enabled!
                </div>
              ) : (
                <button
                  onClick={requestNotifications}
                  className="rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors"
                >
                  Enable Notifications
                </button>
              )}
              <p className="text-xs text-text-tertiary">
                You can change this later in Settings.
              </p>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="space-y-3 text-center">
              <div className="flex items-center justify-center gap-2 rounded-lg bg-accent-success/10 p-4 text-accent-success">
                <Check size={20} />
                <span className="font-medium">Setup complete!</span>
              </div>
              <p className="text-sm text-text-secondary">
                Your feed is now personalized with {watchlistItems.length}{" "}
                watchlist items and customized topic preferences.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-primary px-6 py-4">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary disabled:opacity-0"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors"
          >
            {step === steps.length - 1 ? (
              "Get Started"
            ) : (
              <>
                Next
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
