"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-3xl font-bold text-text-primary">
            News Sources
          </h2>
          <p className="mt-1 text-sm text-text-tertiary">
            {sources.length} sources configured
          </p>
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
        <div className="border-b border-border-primary pb-6 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={newSource.name}
              onChange={(e) =>
                setNewSource({ ...newSource, name: e.target.value })
              }
              placeholder="Source name"
              className="border-b border-border-primary bg-transparent px-1 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-accent-primary"
            />
            <input
              type="text"
              value={newSource.url}
              onChange={(e) =>
                setNewSource({ ...newSource, url: e.target.value })
              }
              placeholder="RSS feed URL or search query"
              className="border-b border-border-primary bg-transparent px-1 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none focus:border-accent-primary"
            />
            <select
              value={newSource.type}
              onChange={(e) =>
                setNewSource({
                  ...newSource,
                  type: e.target.value as "rss" | "api",
                })
              }
              className="border-b border-border-primary bg-transparent px-1 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
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
              className="border-b border-border-primary bg-transparent px-1 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
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
        <div>
          {Object.entries(grouped).map(([topic, topicSources]) => (
            <div
              key={topic}
              className="border-b border-border-primary py-6 first:pt-0 last:border-b-0"
            >
              <h3 className="font-serif text-lg font-bold text-text-primary mb-3">
                {topicLabels[topic as TopicCategory] || topic}
                <span className="ml-2 text-text-tertiary font-normal text-sm">
                  ({topicSources.length})
                </span>
              </h3>
              <div>
                {topicSources.map((source, idx) => (
                  <div
                    key={source.id}
                    className={`flex items-center justify-between py-2 ${
                      idx < topicSources.length - 1
                        ? "border-b border-border-primary/50"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
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
