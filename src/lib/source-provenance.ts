/**
 * Source Provenance System
 *
 * Classifies article sources into five types for visual indicators:
 *   primary   — SEC filings, FDA, USPTO, government databases, company press releases
 *   exclusive — Paywalled/first-to-report (The Information, Puck, Semafor, Bloomberg)
 *   wire      — AP, Reuters, AFP — broadly syndicated
 *   analysis  — Newsletters, opinion/editorial (Stratechery, Matt Levine, etc.)
 *   general   — Standard news coverage (CNBC, TechCrunch, The Verge, etc.)
 */

import type { DocumentType, Article, Summary } from "@/types";

export type SourceType = "primary" | "exclusive" | "wire" | "analysis" | "general";

// ─── Source Name → Type Mapping ───────────────────────────────
// Lowercase keys for case-insensitive matching.
// Easy to extend: just add entries here.

const SOURCE_TYPE_MAP: Record<string, SourceType> = {
  // Primary sources
  "sec edgar 8-k": "primary",
  "sec edgar s-1": "primary",
  "sec edgar 10-k": "primary",
  "sec": "primary",
  "sec edgar": "primary",
  "fda": "primary",
  "uspto": "primary",
  "federal reserve monetary policy": "primary",
  "federal reserve press releases": "primary",
  "federal reserve": "primary",
  "us patent office": "primary",
  "court filing": "primary",
  "press release": "primary",

  // Exclusive sources
  "the information": "exclusive",
  "puck news": "exclusive",
  "puck": "exclusive",
  "semafor": "exclusive",
  "semafor energy": "exclusive",
  "semafor gulf": "exclusive",
  "semafor business": "exclusive",
  "semafor tech": "exclusive",
  "bloomberg": "exclusive",
  "bloomberg news": "exclusive",
  "bloomberg opinion": "exclusive",
  "bloomberg markets": "exclusive",
  "bloomberg technology": "exclusive",
  "bloomberg businessweek": "exclusive",
  "bloomberg evening briefing": "exclusive",
  "bloomberg morning briefing": "exclusive",
  "bloomberg green": "exclusive",

  // Wire services
  "ap": "wire",
  "ap world news": "wire",
  "ap politics": "wire",
  "associated press": "wire",
  "reuters": "wire",
  "reuters business": "wire",
  "reuters world": "wire",
  "afp": "wire",

  // Analysis / newsletters
  "stratechery": "analysis",
  "ben thompson": "analysis",
  "matt levine": "analysis",
  "money stuff": "analysis",
  "matt levine's money stuff": "analysis",
  "byrne hobart": "analysis",
  "the diff": "analysis",
  "packy mccormick": "analysis",
  "not boring": "analysis",
  "eric newcomer": "analysis",
  "newcomer": "analysis",
  "bill bishop": "analysis",
  "sinocism": "analysis",
  "marc rubinstein": "analysis",
  "net interest": "analysis",
  "ben hunt": "analysis",
  "epsilon theory": "analysis",
  "odd lots": "analysis",
  "benedict evans": "analysis",
  "benedict's newsletter": "analysis",
  "lenny's newsletter": "analysis",
  "lenny rachitsky": "analysis",
  "cb insights": "analysis",
  "strictlyvc": "analysis",

  // General news (explicit entries for common sources)
  "techcrunch": "general",
  "the verge": "general",
  "cnbc": "general",
  "venturebeat": "general",
  "wired": "general",
  "fortune": "general",
  "business insider": "general",
  "marketwatch": "general",
  "ars technica": "general",
  "electrek": "general",
  "crunchbase news": "general",
  "morning brew": "general",
  "the hustle": "general",
  "finimize": "general",
  "axios": "general",
  "politico": "general",
  "financial times": "general",
  "ft": "general",
  "wall street journal": "general",
  "wsj": "general",
  "the economist": "general",
  "foreign policy": "general",
  "mit tech review": "general",
  "mit technology review": "general",
};

// ─── Public API ────────────────────────────────────────────────

/**
 * Classify a source into one of five provenance types.
 * Priority: documentType → exact name match → fuzzy name match → default "general"
 */
export function getSourceType(
  sourceName: string,
  documentType?: DocumentType,
): SourceType {
  // 1. If it has a document type, it's a primary source
  if (documentType) return "primary";

  // 2. Exact match (lowercase)
  const lower = sourceName.toLowerCase().trim();
  const exact = SOURCE_TYPE_MAP[lower];
  if (exact) return exact;

  // 3. Fuzzy substring match — check if source name contains a known key
  for (const [key, type] of Object.entries(SOURCE_TYPE_MAP)) {
    if (lower.includes(key) || key.includes(lower)) {
      return type;
    }
  }

  // 4. Default
  return "general";
}

/**
 * Visual config for each source type.
 * icon/label are null when no indicator should be shown.
 */
export function getSourceTypeConfig(type: SourceType): {
  icon: string | null;
  label: string | null;
  color: string;
} {
  switch (type) {
    case "primary":
      return { icon: "📄", label: "PRIMARY SOURCE", color: "var(--accent-primary)" };
    case "exclusive":
      return { icon: "🔒", label: "EXCLUSIVE", color: "#b8860b" };
    case "analysis":
      return { icon: "💡", label: null, color: "var(--text-tertiary)" };
    case "wire":
      return { icon: null, label: null, color: "var(--text-tertiary)" };
    case "general":
      return { icon: null, label: null, color: "var(--text-tertiary)" };
  }
}

// ─── Coverage Density ──────────────────────────────────────────

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "has", "have", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "shall", "its", "it", "this", "that",
  "as", "if", "not", "no", "so", "up", "out", "about", "into", "over",
  "after", "new", "says", "said", "report", "reports",
]);

function significantWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Find how many other articles in the feed cover the same story.
 * Uses topic match + headline word similarity (Jaccard >= 0.3) as heuristic.
 * Also checks key entity overlap from summaries when available.
 */
export function findCoverageDensity(
  article: Article & { summary?: Summary },
  allArticles: (Article & { summary?: Summary })[],
): { count: number; sources: string[] } {
  const titleWords = significantWords(article.title);
  const entityNames = new Set(
    (article.summary?.keyEntities ?? []).map((e) => e.name.toLowerCase())
  );

  const matchingSources: string[] = [];

  for (const other of allArticles) {
    if (other.id === article.id) continue;

    // Must share topic
    if (other.topic !== article.topic) continue;

    // Check headline similarity
    const otherWords = significantWords(other.title);
    const sim = jaccardSimilarity(titleWords, otherWords);

    // Check entity overlap
    let entityOverlap = 0;
    if (entityNames.size > 0 && other.summary?.keyEntities) {
      for (const e of other.summary.keyEntities) {
        if (entityNames.has(e.name.toLowerCase())) entityOverlap++;
      }
    }

    if (sim >= 0.3 || entityOverlap >= 2) {
      if (!matchingSources.includes(other.source)) {
        matchingSources.push(other.source);
      }
    }
  }

  return {
    count: matchingSources.length + 1, // +1 for the article itself
    sources: matchingSources,
  };
}
