"use client";

import { useState } from "react";
import {
  FileText,
  Loader2,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import type { Article, Summary } from "@/types";

interface BriefMeViewProps {
  articles: (Article & { summary?: Summary })[];
}

export function BriefMeView({ articles }: BriefMeViewProps) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState("");
  const [articleCount, setArticleCount] = useState(0);

  const generateBriefing = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const articleData = articles.slice(0, 25).map((a) => ({
        title: a.title,
        source: a.source,
        brief: a.summary?.brief || "",
        topic: a.topic,
        publishedAt: a.publishedAt,
      }));

      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articles: articleData,
          focus: focus.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setBriefing(data.briefing);
        setArticleCount(data.articleCount);
      }
    } catch {
      setError("Failed to generate briefing. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const focusSuggestions = [
    "AI & Machine Learning",
    "VC Fundraising",
    "Executive Hiring",
    "Market Trends",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText size={24} className="text-accent-primary" />
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Brief Me</h2>
          <p className="text-sm text-text-tertiary">
            AI-generated executive briefing from your feed
          </p>
        </div>
      </div>

      {/* Generate controls */}
      <div className="rounded-xl border border-border-primary bg-bg-card p-5">
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Focus Area (optional)
            </label>
            <input
              type="text"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="e.g., AI startups, executive changes, fintech..."
              className="w-full rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-accent-primary"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {focusSuggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setFocus(s)}
                  className="rounded-full border border-border-primary px-2.5 py-1 text-xs text-text-tertiary hover:bg-bg-hover hover:text-text-secondary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generateBriefing}
            disabled={isLoading || articles.length === 0}
            className="flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating briefing...
              </>
            ) : briefing ? (
              <>
                <RefreshCw size={16} />
                Regenerate Briefing
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate Briefing
              </>
            )}
          </button>

          {articles.length === 0 && (
            <p className="text-xs text-text-tertiary">
              No articles available. Fetch some news first.
            </p>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-accent-danger/30 bg-accent-danger/10 p-3 text-sm text-accent-danger">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Briefing output */}
      {briefing && (
        <div className="rounded-xl border border-border-primary bg-bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-text-tertiary">
              Based on {articleCount} articles
            </span>
            <span className="text-xs text-text-tertiary">
              Generated {new Date().toLocaleTimeString()}
            </span>
          </div>
          <div
            className="prose prose-sm max-w-none dark:prose-invert text-text-primary [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-text-primary [&_h2]:mt-4 [&_h2]:mb-2 [&_li]:text-text-secondary [&_p]:text-text-secondary [&_strong]:text-text-primary"
            dangerouslySetInnerHTML={{
              __html: formatBriefingMarkdown(briefing),
            }}
          />
        </div>
      )}

      {/* Placeholder when no briefing generated */}
      {!briefing && !isLoading && !error && (
        <div className="rounded-xl border border-border-primary bg-bg-card p-8 text-center">
          <Sparkles size={32} className="mx-auto mb-3 text-text-tertiary" />
          <p className="text-text-secondary">
            Click &ldquo;Generate Briefing&rdquo; to create an AI-powered
            executive summary of your current feed.
          </p>
          <p className="mt-1 text-sm text-text-tertiary">
            Optionally add a focus area to customize the briefing.
          </p>
        </div>
      )}
    </div>
  );
}

function formatBriefingMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="rounded bg-bg-tertiary px-1 py-0.5 text-xs">$1</code>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-3 mb-1">$1</h1>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}
