"use client";

import { useState } from "react";
import {
  Rss,
  Plus,
  Trash2,
  Globe,
  Zap,
  X,
  Loader2,
} from "lucide-react";
import { useSources, type Source } from "@/hooks/useSources";
import { topicLabels } from "@/lib/mock-data";
import type { TopicCategory } from "@/types";
import { useToastStore } from "@/components/ui/Toast";

export function SourceManager() {
  const { sources, isLoading, addSource, removeSource } = useSources();
  const { addToast } = useToastStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newSource, setNewSource] = useState({
    name: "",
    url: "",
    type: "rss" as "rss" | "api",
    topic: "science-tech" as TopicCategory,
  });

  const handleAdd = async () => {
    if (!newSource.name || !newSource.url) {
      addToast("Name and URL are required", "error");
      return;
    }
    const success = await addSource(newSource);
    if (success) {
      addToast(`Added source "${newSource.name}"`, "success");
      setNewSource({ name: "", url: "", type: "rss", topic: "science-tech" });
      setShowAdd(false);
    } else {
      addToast("Failed to add source (Supabase may not be configured)", "error");
    }
  };

  const handleRemove = async (source: Source) => {
    const success = await removeSource(source.id);
    if (success) {
      addToast(`Removed "${source.name}"`, "info");
    } else {
      addToast("Failed to remove source", "error");
    }
  };

  // Group sources by topic
  const grouped: Record<string, Source[]> = {};
  for (const s of sources) {
    const topic = s.topic;
    if (!grouped[topic]) grouped[topic] = [];
    grouped[topic].push(s);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Rss size={24} className="text-accent-primary" />
          <div>
            <h2 className="text-2xl font-bold text-text-primary">
              News Sources
            </h2>
            <p className="text-sm text-text-tertiary">
              {sources.length} sources configured
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded-lg bg-accent-primary px-3 py-2 text-sm font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors"
        >
          <Plus size={16} />
          Add Source
        </button>
      </div>

      {/* Add source form */}
      {showAdd && (
        <div className="rounded-xl border border-accent-primary/30 bg-bg-card p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={newSource.name}
              onChange={(e) =>
                setNewSource({ ...newSource, name: e.target.value })
              }
              placeholder="Source name"
              className="rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-accent-primary"
            />
            <input
              type="text"
              value={newSource.url}
              onChange={(e) =>
                setNewSource({ ...newSource, url: e.target.value })
              }
              placeholder="RSS feed URL or search query"
              className="rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-accent-primary"
            />
            <select
              value={newSource.type}
              onChange={(e) =>
                setNewSource({
                  ...newSource,
                  type: e.target.value as "rss" | "api",
                })
              }
              className="rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
            >
              <option value="rss">RSS Feed</option>
              <option value="api">NewsAPI Search</option>
            </select>
            <select
              value={newSource.topic}
              onChange={(e) =>
                setNewSource({
                  ...newSource,
                  topic: e.target.value as TopicCategory,
                })
              }
              className="rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
            >
              {Object.entries(topicLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-accent-primary-hover transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="rounded-lg border border-border-primary px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Source list grouped by topic */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-text-tertiary">
          <Loader2 size={16} className="animate-spin" />
          Loading sources...
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([topic, topicSources]) => (
            <div
              key={topic}
              className="rounded-xl border border-border-primary bg-bg-card p-4"
            >
              <h3 className="mb-3 text-sm font-semibold text-text-primary">
                {topicLabels[topic as TopicCategory] || topic}
                <span className="ml-2 text-text-tertiary font-normal">
                  ({topicSources.length})
                </span>
              </h3>
              <div className="space-y-2">
                {topicSources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between rounded-lg bg-bg-secondary px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      {source.type === "rss" ? (
                        <Rss size={14} className="text-accent-primary" />
                      ) : (
                        <Zap size={14} className="text-accent-warning" />
                      )}
                      <span className="text-sm text-text-primary">
                        {source.name}
                      </span>
                      <span className="text-xs text-text-tertiary">
                        {source.type.toUpperCase()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemove(source)}
                      className="rounded-md p-1 text-text-tertiary hover:text-accent-danger transition-colors"
                      aria-label={`Remove ${source.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
