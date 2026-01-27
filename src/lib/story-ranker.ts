/**
 * Story Ranking Algorithm
 *
 * Computes a composite ranking_score (0–100) for each article based on:
 *   1. Source Authority (0–30)  — tier system weight
 *   2. Story Magnitude  (0–25)  — blast radius, financial scale, keyword signals
 *   3. Authority of Voice (0–20) — quotes/mentions of high-authority figures
 *   4. Staying Power (0–15)     — original reporting vs derivative coverage
 *   5. First-to-Report (0–10)   — bonus for earliest coverage of a topic
 *
 * Also provides getTopStories() with diversity enforcement:
 *   - Max 2 articles from the same publication
 *   - Max 2 articles from the same topic category
 */

import type { SourceTier } from "@/types";
import { supabase, isSupabaseConfigured } from "./supabase";

// ─── Scoring Weights ────────────────────────────────────────

const WEIGHTS = {
  SOURCE_AUTHORITY: 30,
  STORY_MAGNITUDE: 25,
  AUTHORITY_OF_VOICE: 20,
  STAYING_POWER: 15,
  FIRST_TO_REPORT: 10,
} as const;

// ─── 1. Source Authority ────────────────────────────────────

function scoreSourceAuthority(sourceTier: SourceTier | number | null): number {
  switch (sourceTier) {
    case 1:
      return WEIGHTS.SOURCE_AUTHORITY; // 30 — Edge
    case 2:
      return WEIGHTS.SOURCE_AUTHORITY * 0.65; // 19.5 — Quality
    case 3:
      return WEIGHTS.SOURCE_AUTHORITY * 0.33; // ~10 — Mainstream
    default:
      return WEIGHTS.SOURCE_AUTHORITY * 0.33;
  }
}

// ─── 2. Story Magnitude / Blast Radius ──────────────────────

const MAGNITUDE_KEYWORDS: { pattern: RegExp; points: number }[] = [
  // Financial scale (higher = bigger story)
  { pattern: /\btrillion/i, points: 25 },
  { pattern: /\bbillion/i, points: 20 },
  { pattern: /\bhundred[s]?\s*million/i, points: 15 },
  { pattern: /\bmillion/i, points: 8 },

  // Scope / blast radius
  { pattern: /\bnationwide\b/i, points: 15 },
  { pattern: /\bindustry[- ]wide\b/i, points: 15 },
  { pattern: /\bglobal\b/i, points: 12 },
  { pattern: /\bworldwide\b/i, points: 12 },
  { pattern: /\bwar\b/i, points: 18 },
  { pattern: /\bcrisis\b/i, points: 15 },
  { pattern: /\bpandemic\b/i, points: 20 },
  { pattern: /\brecession\b/i, points: 18 },
  { pattern: /\bcollapse[ds]?\b/i, points: 18 },
  { pattern: /\bshutdown\b/i, points: 12 },
  { pattern: /\bbankrupt/i, points: 18 },
  { pattern: /\bdefault[eds]?\b/i, points: 15 },

  // Regulatory / policy
  { pattern: /\bban[ns]?(ed|ning)?\b/i, points: 14 },
  { pattern: /\bsanction[eds]?\b/i, points: 14 },
  { pattern: /\btariff/i, points: 12 },
  { pattern: /\bregulat/i, points: 10 },
  { pattern: /\bantitrust\b/i, points: 12 },
  { pattern: /\bexecutive\s+order\b/i, points: 14 },

  // M&A / deals
  { pattern: /\bacquisition\b/i, points: 12 },
  { pattern: /\bacquire[ds]?\b/i, points: 12 },
  { pattern: /\bmerger\b/i, points: 14 },
  { pattern: /\bIPO\b/, points: 14 },

  // Major events
  { pattern: /\belection\b/i, points: 12 },
  { pattern: /\bimpeach/i, points: 16 },
  { pattern: /\bindictment\b/i, points: 14 },
  { pattern: /\barrest[eds]?\b/i, points: 10 },

  // Primary documents / regulatory filings
  { pattern: /\b8-K\b/, points: 14 },
  { pattern: /\bS-1\b/, points: 16 },
  { pattern: /\b10-K\b/, points: 12 },
  { pattern: /\bFOMC\b/, points: 18 },
  { pattern: /\bmaterial event\b/i, points: 14 },
  { pattern: /\brisk factor/i, points: 10 },
  { pattern: /\bIPO filing\b/i, points: 16 },
];

function scoreStoryMagnitude(title: string, content: string): number {
  const text = `${title} ${content}`.slice(0, 3000);
  let score = 0;

  for (const kw of MAGNITUDE_KEYWORDS) {
    if (kw.pattern.test(text)) {
      score += kw.points;
    }
  }

  // Normalize to 0–25 (cap and scale)
  return Math.min(WEIGHTS.STORY_MAGNITUDE, score * (WEIGHTS.STORY_MAGNITUDE / 40));
}

// ─── 3. Authority of Voice ──────────────────────────────────

const HIGH_AUTHORITY_VOICES: { pattern: RegExp; points: number }[] = [
  // AI leaders
  { pattern: /\bDario Amodei\b/i, points: 18 },
  { pattern: /\bSam Altman\b/i, points: 18 },
  { pattern: /\bJensen Huang\b/i, points: 16 },
  { pattern: /\bSatya Nadella\b/i, points: 16 },
  { pattern: /\bSundar Pichai\b/i, points: 14 },
  { pattern: /\bMark Zuckerberg\b/i, points: 14 },
  { pattern: /\bTim Cook\b/i, points: 14 },

  // Finance / markets
  { pattern: /\bJerome Powell\b/i, points: 20 },
  { pattern: /\bJanet Yellen\b/i, points: 16 },
  { pattern: /\bJamie Dimon\b/i, points: 16 },
  { pattern: /\bRay Dalio\b/i, points: 14 },
  { pattern: /\bWarren Buffett\b/i, points: 16 },
  { pattern: /\bLarry Fink\b/i, points: 14 },

  // VC / tech investors
  { pattern: /\bMarc Andreessen\b/i, points: 14 },
  { pattern: /\bVinod Khosla\b/i, points: 12 },
  { pattern: /\bBen Horowitz\b/i, points: 10 },
  { pattern: /\bKeith Rabois\b/i, points: 10 },
  { pattern: /\bPeter Thiel\b/i, points: 12 },
  { pattern: /\bMasayoshi Son\b/i, points: 12 },

  // World leaders
  { pattern: /\bPresident\s+(Trump|Biden)\b/i, points: 16 },
  { pattern: /\bXi Jinping\b/i, points: 16 },
  { pattern: /\bPutin\b/i, points: 14 },
  { pattern: /\bElon Musk\b/i, points: 14 },

  // Generic authority markers
  { pattern: /\bFederal Reserve\b/i, points: 14 },
  { pattern: /\bSEC\b/, points: 10 },
  { pattern: /\bDOJ\b/, points: 10 },
  { pattern: /\bSupreme Court\b/i, points: 14 },
];

function scoreAuthorityOfVoice(title: string, content: string): number {
  const text = `${title} ${content}`.slice(0, 3000);
  let score = 0;

  for (const voice of HIGH_AUTHORITY_VOICES) {
    if (voice.pattern.test(text)) {
      score += voice.points;
    }
  }

  // Normalize to 0–20 (cap and scale)
  return Math.min(WEIGHTS.AUTHORITY_OF_VOICE, score * (WEIGHTS.AUTHORITY_OF_VOICE / 30));
}

// ─── 4. Staying Power ───────────────────────────────────────

const ORIGINAL_REPORTING_SIGNALS: { pattern: RegExp; points: number }[] = [
  { pattern: /\bexclusive\b/i, points: 15 },
  { pattern: /\bbreaking\b/i, points: 12 },
  { pattern: /\bfirst reported\b/i, points: 15 },
  { pattern: /\binvestigation\b/i, points: 14 },
  { pattern: /\banalysis\b/i, points: 8 },
  { pattern: /\bin-depth\b/i, points: 8 },
  { pattern: /\bexposé\b/i, points: 15 },
  { pattern: /\bscoop\b/i, points: 14 },
  { pattern: /\bunveils?\b/i, points: 8 },
  { pattern: /\bannounce[ds]?\b/i, points: 6 },
  { pattern: /\blaunch(es|ed)?\b/i, points: 6 },
];

const DERIVATIVE_COVERAGE_SIGNALS: { pattern: RegExp; penalty: number }[] = [
  { pattern: /\breacts?\s+to\b/i, penalty: 10 },
  { pattern: /\bresponds?\s+to\b/i, penalty: 10 },
  { pattern: /\bfollowing\s+(news|reports?)\b/i, penalty: 8 },
  { pattern: /\bweighs?\s+in\b/i, penalty: 8 },
  { pattern: /\bsays?\s+about\b/i, penalty: 6 },
  { pattern: /\baccording\s+to\s+reports?\b/i, penalty: 6 },
  { pattern: /\breport(ed|s)?\s+(by|from)\b/i, penalty: 4 },
  { pattern: /\bopinion\b/i, penalty: 4 },
];

function scoreStayingPower(
  title: string,
  content: string,
  storyType?: string | null
): number {
  const text = `${title} ${content}`.slice(0, 2000);
  let score = 0;

  // Boost for original reporting signals
  for (const signal of ORIGINAL_REPORTING_SIGNALS) {
    if (signal.pattern.test(text)) {
      score += signal.points;
    }
  }

  // Penalty for derivative coverage
  for (const signal of DERIVATIVE_COVERAGE_SIGNALS) {
    if (signal.pattern.test(text)) {
      score -= signal.penalty;
    }
  }

  // Boost based on story_type from intelligence (if available)
  if (storyType) {
    switch (storyType) {
      case "breaking":
        score += 12;
        break;
      case "developing":
        score += 8;
        break;
      case "analysis":
        score += 6;
        break;
      case "feature":
        score += 4;
        break;
      case "opinion":
        score -= 2;
        break;
      case "update":
        score += 0;
        break;
    }
  }

  // Normalize to 0–15
  return Math.max(0, Math.min(WEIGHTS.STAYING_POWER, score * (WEIGHTS.STAYING_POWER / 25)));
}

// ─── 5. First-to-Report Bonus ───────────────────────────────

/**
 * Detect title similarity using word overlap (Jaccard-like).
 * Returns a score between 0 and 1.
 */
function titleSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2);

  const wordsA = new Set(normalize(a));
  const wordsB = new Set(normalize(b));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}

/**
 * Score first-to-report: compare this article against others in the batch.
 * If this article is the first to cover a similar story, give it a bonus.
 * If it's a Tier 1 source covering something first, even bigger bonus.
 */
function scoreFirstToReport(
  article: RankableArticle,
  allArticles: RankableArticle[]
): number {
  const SIMILARITY_THRESHOLD = 0.4;

  // Find articles covering similar stories
  const similarArticles = allArticles.filter(
    (other) =>
      other.id !== article.id &&
      titleSimilarity(article.title, other.title) >= SIMILARITY_THRESHOLD
  );

  if (similarArticles.length === 0) {
    // Unique story — no duplicates found, modest bonus
    return WEIGHTS.FIRST_TO_REPORT * 0.5; // 5 points
  }

  // Check if this article was published first among similar stories
  const articleTime = new Date(article.publishedAt).getTime();
  const isFirst = similarArticles.every(
    (other) => new Date(other.publishedAt).getTime() >= articleTime
  );

  if (isFirst) {
    // First to report — full bonus, extra if Tier 1
    const tierBonus = article.sourceTier === 1 ? 1.0 : 0.7;
    return WEIGHTS.FIRST_TO_REPORT * tierBonus;
  }

  // Not first — penalize slightly (derivative)
  return 0;
}

// ─── Core Ranking Types ─────────────────────────────────────

export interface RankableArticle {
  id: string;
  title: string;
  content: string;
  url: string;
  topic: string;
  sourceTier: number;
  publishedAt: string;
  // From article_intelligence (optional)
  significanceScore?: number | null;
  storyType?: string | null;
}

export interface RankingResult {
  articleId: string;
  rankingScore: number;
  breakdown: {
    sourceAuthority: number;
    storyMagnitude: number;
    authorityOfVoice: number;
    stayingPower: number;
    firstToReport: number;
  };
}

// ─── Main Ranking Function ──────────────────────────────────

/**
 * Compute ranking scores for a batch of articles.
 * Each article gets a score from 0–100 based on the five factors.
 */
export function rankArticles(articles: RankableArticle[]): RankingResult[] {
  return articles.map((article) => {
    const sourceAuthority = scoreSourceAuthority(article.sourceTier as SourceTier);
    const storyMagnitude = scoreStoryMagnitude(article.title, article.content || "");
    const authorityOfVoice = scoreAuthorityOfVoice(article.title, article.content || "");
    const stayingPower = scoreStayingPower(
      article.title,
      article.content || "",
      article.storyType
    );
    const firstToReport = scoreFirstToReport(article, articles);

    // Apply significance_score multiplier if available (from AI intelligence)
    // significance_score is 1-10, use it as a 0.7x–1.3x multiplier
    let significanceMultiplier = 1.0;
    if (article.significanceScore && article.significanceScore >= 1) {
      // Map 1-10 → 0.7-1.3
      significanceMultiplier = 0.7 + (article.significanceScore / 10) * 0.6;
    }

    const rawScore =
      sourceAuthority + storyMagnitude + authorityOfVoice + stayingPower + firstToReport;

    // Apply significance multiplier, then cap at 100
    const finalScore = Math.min(100, Math.round(rawScore * significanceMultiplier * 100) / 100);

    return {
      articleId: article.id,
      rankingScore: finalScore,
      breakdown: {
        sourceAuthority: Math.round(sourceAuthority * 100) / 100,
        storyMagnitude: Math.round(storyMagnitude * 100) / 100,
        authorityOfVoice: Math.round(authorityOfVoice * 100) / 100,
        stayingPower: Math.round(stayingPower * 100) / 100,
        firstToReport: Math.round(firstToReport * 100) / 100,
      },
    };
  });
}

// ─── Store Rankings in Database ─────────────────────────────

/**
 * Batch update ranking_score for articles in Supabase.
 */
export async function storeRankingScores(
  results: RankingResult[]
): Promise<{ updated: number; errors: number }> {
  const stats = { updated: 0, errors: 0 };

  if (!isSupabaseConfigured() || !supabase || results.length === 0) {
    return stats;
  }

  // Update in batches of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);

    for (const result of batch) {
      try {
        const { error } = await supabase
          .from("articles")
          .update({ ranking_score: result.rankingScore })
          .eq("id", result.articleId);

        if (error) {
          console.error("[Ranker] Update error:", error.message);
          stats.errors++;
        } else {
          stats.updated++;
        }
      } catch {
        stats.errors++;
      }
    }
  }

  return stats;
}

// ─── Full Pipeline: Rank + Store ────────────────────────────

/**
 * Full ranking pipeline: fetch recent articles, compute scores, store.
 * Fetches articles from the last 24 hours with their intelligence data.
 */
export async function rankRecentArticles(): Promise<{
  ranked: number;
  stored: number;
  errors: number;
  topScore: number;
  bottomScore: number;
}> {
  const stats = { ranked: 0, stored: 0, errors: 0, topScore: 0, bottomScore: 0 };

  if (!isSupabaseConfigured() || !supabase) {
    return stats;
  }

  // Fetch articles from the last 24 hours, joined with intelligence
  const since = new Date();
  since.setHours(since.getHours() - 24);

  let data: Record<string, unknown>[] | null = null;

  // Try with intelligence join first
  const { data: fullData, error: fullError } = await supabase
    .from("articles")
    .select(
      "id, title, content, url, topic, source_tier, published_at, article_intelligence(significance_score, story_type)"
    )
    .gte("published_at", since.toISOString())
    .order("published_at", { ascending: false })
    .limit(500);

  if (!fullError) {
    data = fullData as Record<string, unknown>[];
  } else {
    // Fallback without intelligence
    console.warn("[Ranker] Falling back without intelligence join:", fullError.message);
    const { data: fallbackData } = await supabase
      .from("articles")
      .select("id, title, content, url, topic, source_tier, published_at")
      .gte("published_at", since.toISOString())
      .order("published_at", { ascending: false })
      .limit(500);

    data = (fallbackData as Record<string, unknown>[]) || [];
  }

  if (!data || data.length === 0) {
    return stats;
  }

  // Map to RankableArticle
  const articles: RankableArticle[] = data.map((row) => {
    const intel = row.article_intelligence as
      | { significance_score?: number; story_type?: string }
      | { significance_score?: number; story_type?: string }[]
      | null;

    // intelligence may be an object or array (Supabase returns array for joins)
    const intelData = Array.isArray(intel) ? intel[0] : intel;

    return {
      id: row.id as string,
      title: row.title as string,
      content: (row.content as string) || "",
      url: (row.url as string) || "",
      topic: (row.topic as string) || "",
      sourceTier: (row.source_tier as number) || 3,
      publishedAt: (row.published_at as string) || new Date().toISOString(),
      significanceScore: intelData?.significance_score ?? null,
      storyType: intelData?.story_type ?? null,
    };
  });

  // Compute rankings
  const results = rankArticles(articles);
  stats.ranked = results.length;

  if (results.length > 0) {
    const sorted = [...results].sort((a, b) => b.rankingScore - a.rankingScore);
    stats.topScore = sorted[0].rankingScore;
    stats.bottomScore = sorted[sorted.length - 1].rankingScore;
  }

  // Store rankings
  const storeStats = await storeRankingScores(results);
  stats.stored = storeStats.updated;
  stats.errors = storeStats.errors;

  return stats;
}

// ─── Get Top Stories with Diversity Rules ────────────────────

export interface TopStoriesOptions {
  count?: number;
  maxPerPublication?: number;
  maxPerTopic?: number;
  hoursBack?: number;
}

/**
 * Fetch the top-ranked stories with diversity enforcement.
 * - Max 2 articles from the same publication (by URL domain)
 * - Max 2 articles from the same topic category
 */
export async function getTopStories(
  options?: TopStoriesOptions
): Promise<Record<string, unknown>[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  const {
    count = 5,
    maxPerPublication = 2,
    maxPerTopic = 2,
    hoursBack = 24,
  } = options || {};

  const since = new Date();
  since.setHours(since.getHours() - hoursBack);

  // Fetch more than needed so we can apply diversity filters
  const fetchLimit = count * 5;

  const { data, error } = await supabase
    .from("articles")
    .select(
      "*, summaries(brief, the_news, why_it_matters), article_intelligence(significance_score, story_type, watch_for_next)"
    )
    .gte("published_at", since.toISOString())
    .gt("ranking_score", 0)
    .order("ranking_score", { ascending: false })
    .limit(fetchLimit);

  if (error || !data) {
    // Fallback without joins
    const { data: fallback } = await supabase
      .from("articles")
      .select("*")
      .gte("published_at", since.toISOString())
      .gt("ranking_score", 0)
      .order("ranking_score", { ascending: false })
      .limit(fetchLimit);

    if (!fallback) return [];

    return applyDiversityFilter(
      fallback as Record<string, unknown>[],
      count,
      maxPerPublication,
      maxPerTopic
    );
  }

  return applyDiversityFilter(
    data as Record<string, unknown>[],
    count,
    maxPerPublication,
    maxPerTopic
  );
}

/**
 * Apply diversity rules: max N articles per publication, max N per topic.
 */
function applyDiversityFilter(
  articles: Record<string, unknown>[],
  count: number,
  maxPerPublication: number,
  maxPerTopic: number
): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];
  const pubCount: Record<string, number> = {};
  const topicCount: Record<string, number> = {};

  for (const article of articles) {
    if (result.length >= count) break;

    // Extract publication from URL domain
    const pub = extractPublication(article.url as string);
    const topic = (article.topic as string) || "unknown";

    const currentPubCount = pubCount[pub] || 0;
    const currentTopicCount = topicCount[topic] || 0;

    if (currentPubCount >= maxPerPublication) continue;
    if (currentTopicCount >= maxPerTopic) continue;

    result.push(article);
    pubCount[pub] = currentPubCount + 1;
    topicCount[topic] = currentTopicCount + 1;
  }

  return result;
}

/**
 * Extract a publication identifier from a URL.
 */
function extractPublication(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    // Strip www. and common subdomains
    return hostname.replace(/^(www|feeds|rss|news)\./i, "");
  } catch {
    return "unknown";
  }
}
