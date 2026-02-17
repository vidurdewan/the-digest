/**
 * Smart Surfacing System
 *
 * Client-side utilities for "New to You" scoring, freshness labels,
 * developing story detection, and time-based feed grouping.
 */

import type { Article, Summary } from "@/types";

// ─── Reading Patterns ────────────────────────────────────────

export interface ReadingPatterns {
  sourceReadCounts: Record<string, number>;
  topicReadCounts: Record<string, number>;
}

function topN(counts: Record<string, number>, n: number): Set<string> {
  return new Set(
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k]) => k)
  );
}

// ─── New-to-You Scoring ──────────────────────────────────────

export interface NewToYouResult {
  score: number;
  reason: string;
}

export function computeNewToYouScore(
  article: Article & { summary?: Summary },
  patterns: ReadingPatterns,
  coverageCount: number,
): NewToYouResult {
  let score = 0;
  let reason = "";

  const topSources = topN(patterns.sourceReadCounts, 5);
  const topTopics = topN(patterns.topicReadCounts, 3);

  // Source rarity: +2
  if (!topSources.has(article.source)) {
    score += 2;
    if (!reason) reason = `Rare source: ${article.source}`;
  }

  // Coverage density: +3 if only 1-2 outlets
  if (coverageCount <= 2) {
    score += 3;
    reason = `Only in ${article.source}`;
  }

  // Topic novelty: +1
  if (!topTopics.has(article.topic)) {
    score += 1;
    if (!reason) reason = "Unusual topic for you";
  }

  // Primary source: +2
  if (article.documentType) {
    score += 2;
    reason = article.documentType; // "8-K", "S-1", etc.
  }

  // Recency: +1 if < 2h
  const ageMs = Date.now() - new Date(article.publishedAt).getTime();
  if (ageMs < 2 * 3600_000) {
    score += 1;
  }

  if (!reason) reason = "New to you";

  return { score, reason };
}

// ─── Freshness Labels ────────────────────────────────────────

export interface FreshnessResult {
  label: string;
  isUrgent: boolean;
  tooltip: string;
}

export function formatFreshness(dateString: string): FreshnessResult {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = diffMs / 3_600_000;

  const tooltip = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // < 60 min
  if (diffMin < 60) {
    return {
      label: diffMin <= 1 ? "Just now" : `${diffMin} min ago`,
      isUrgent: true,
      tooltip,
    };
  }

  // 1-3h
  if (diffHours < 3) {
    return {
      label: `${Math.floor(diffHours)}h ago`,
      isUrgent: false,
      tooltip,
    };
  }

  // 3-8h same day
  if (diffHours < 8) {
    const hour = date.getHours();
    const period = hour < 12 ? "This morning" : "This afternoon";
    return { label: period, isUrgent: false, tooltip };
  }

  // 8-24h
  if (diffHours < 24) {
    return { label: "Yesterday", isUrgent: false, tooltip };
  }

  // 24-48h
  if (diffHours < 48) {
    return { label: "Yesterday", isUrgent: false, tooltip };
  }

  // 48h+
  return {
    label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase(),
    isUrgent: false,
    tooltip,
  };
}

// ─── Developing Story Detection ──────────────────────────────

export interface DevelopingStory {
  leadArticleId: string;
  updateIds: string[]; // oldest → newest (excluding lead)
  entityOverlap: string[];
}

export function detectDevelopingStories(
  articles: (Article & { summary?: Summary })[],
): { stories: DevelopingStory[]; groupedIds: Set<string> } {
  // Build adjacency: articles with same topic, entity overlap ≥ 2, within 6h
  const SIX_HOURS = 6 * 3_600_000;
  const n = articles.length;

  // Extract entities per article
  const entityMap = new Map<string, string[]>();
  for (const a of articles) {
    const names = (a.summary?.keyEntities ?? []).map((e) => e.name.toLowerCase());
    entityMap.set(a.id, names);
  }

  // Union-find for transitive grouping
  const parent = new Map<string, string>();
  function find(x: string): string {
    if (!parent.has(x)) parent.set(x, x);
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
    return parent.get(x)!;
  }
  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  // Track entity overlap per pair for later reporting
  const pairOverlap = new Map<string, string[]>();

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = articles[i];
      const b = articles[j];
      if (a.topic !== b.topic) continue;

      const timeDiff = Math.abs(
        new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
      );
      if (timeDiff > SIX_HOURS) continue;

      const entA = entityMap.get(a.id) ?? [];
      const entB = entityMap.get(b.id) ?? [];
      const overlap = entA.filter((e) => entB.includes(e));
      if (overlap.length >= 2) {
        union(a.id, b.id);
        const key = [a.id, b.id].sort().join("|");
        pairOverlap.set(key, overlap);
      }
    }
  }

  // Collect groups
  const groups = new Map<string, string[]>();
  for (const a of articles) {
    const root = find(a.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(a.id);
  }

  const stories: DevelopingStory[] = [];
  const groupedIds = new Set<string>();

  for (const [, ids] of groups) {
    if (ids.length < 2) continue;

    // Sort by publishedAt ascending
    const sorted = ids
      .map((id) => articles.find((a) => a.id === id)!)
      .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());

    const lead = sorted[sorted.length - 1]; // most recent
    const updates = sorted.slice(0, -1);

    // Collect all overlapping entities
    const allOverlap = new Set<string>();
    for (const [key, overlap] of pairOverlap) {
      if (ids.some((id) => key.includes(id))) {
        overlap.forEach((e) => allOverlap.add(e));
      }
    }

    stories.push({
      leadArticleId: lead.id,
      updateIds: updates.map((a) => a.id),
      entityOverlap: Array.from(allOverlap),
    });

    // Mark non-lead articles as grouped (hidden from main feed)
    for (const u of updates) {
      groupedIds.add(u.id);
    }
  }

  return { stories, groupedIds };
}

// ─── Time Group Assignment ───────────────────────────────────

export type TimeGroup = "last-hour" | "this-morning" | "this-afternoon" | "yesterday" | "older";

const TIME_GROUP_LABELS: Record<TimeGroup, string> = {
  "last-hour": "Last hour",
  "this-morning": "This morning",
  "this-afternoon": "This afternoon",
  "yesterday": "Yesterday",
  "older": "Earlier",
};

export function getTimeGroup(dateString: string): TimeGroup {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = diffMs / 60_000;

  if (diffMin < 60) return "last-hour";

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  if (date >= todayStart) {
    const hour = date.getHours();
    return hour < 12 ? "this-morning" : "this-afternoon";
  }

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  if (date >= yesterdayStart) return "yesterday";

  return "older";
}

export function getTimeGroupLabel(group: TimeGroup): string {
  return TIME_GROUP_LABELS[group];
}
