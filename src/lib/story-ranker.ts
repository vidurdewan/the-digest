/**
 * Story Ranking Algorithm
 *
 * Computes a ranking_score for each article:
 *   Step 1: Base score by source tier (50 / 25 / 0)
 *   Step 2: Add bonuses (exclusive +15, authority voice +10, financial magnitude +10,
 *           broad impact +5, recency +5, VIP +20, first-to-report +10)
 *   Step 3: Apply penalties (derivative headline -15, summarizing others -10)
 *   Step 4: ranking_score = base + bonuses - penalties
 *
 * Also provides getTopStories() with diversity enforcement:
 *   - Max 2 articles from the same publication
 *   - Max 2 articles from the same topic category
 */

import { supabase, isSupabaseConfigured } from "./supabase";

// ─── Step 1: Base Score by Source Tier ──────────────────────

function getBaseScore(sourceTier: number | null): number {
  switch (sourceTier) {
    case 1:
      return 50;
    case 2:
      return 25;
    case 3:
      return 0;
    default:
      return 0;
  }
}

// ─── Step 2: Bonuses ────────────────────────────────────────

// Exclusive / breaking / original reporting keywords → +15 (flat, once)
const EXCLUSIVE_PATTERNS = [
  /\bexclusive\b/i,
  /\bbreaking\b/i,
  /\bscoop\b/i,
  /\binvestigation\b/i,
  /\bfirst reported\b/i,
];

function hasExclusiveContent(title: string, content: string): boolean {
  const text = `${title} ${content}`.slice(0, 3000);
  return EXCLUSIVE_PATTERNS.some((p) => p.test(text));
}

// Authority voice mentions → +10 (flat, once)
const AUTHORITY_VOICES = [
  /\bRay Dalio\b/i,
  /\bDario Amodei\b/i,
  /\bJerome Powell\b/i,
  /\bJamie Dimon\b/i,
  /\bSatya Nadella\b/i,
  /\bJensen Huang\b/i,
  /\bMarc Andreessen\b/i,
  /\bSam Altman\b/i,
  /\bElon Musk\b/i,
  /\bTim Cook\b/i,
  /\bSundar Pichai\b/i,
];

function hasAuthorityVoice(title: string, content: string): boolean {
  const text = `${title} ${content}`.slice(0, 3000);
  return AUTHORITY_VOICES.some((p) => p.test(text));
}

// Financial magnitude mentions → +10 (flat, once)
const FINANCIAL_MAGNITUDE_PATTERNS = [
  /\bbillion\b/i,
  /\$1B\b/i,
  /\$10B\b/i,
  /\bIPO\b/,
  /\bacquisition\b/i,
];

function hasFinancialMagnitude(title: string, content: string): boolean {
  const text = `${title} ${content}`.slice(0, 3000);
  return FINANCIAL_MAGNITUDE_PATTERNS.some((p) => p.test(text));
}

// Broad impact mentions → +5 (flat, once)
const BROAD_IMPACT_PATTERNS = [
  /\bglobal\b/i,
  /\bnationwide\b/i,
  /\bindustry[- ]wide\b/i,
  /\bmarket[- ]wide\b/i,
];

function hasBroadImpact(title: string, content: string): boolean {
  const text = `${title} ${content}`.slice(0, 3000);
  return BROAD_IMPACT_PATTERNS.some((p) => p.test(text));
}

// Published within last 2 hours → +5
function isRecentlyPublished(publishedAt: string): boolean {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  return new Date(publishedAt).getTime() > twoHoursAgo;
}

// First to report → +10
// Compare against other articles in the batch; if no earlier article covers the same topic, it's first.
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

function isFirstToReport(
  article: RankableArticle,
  allArticles: RankableArticle[]
): boolean {
  const SIMILARITY_THRESHOLD = 0.4;

  const similarArticles = allArticles.filter(
    (other) =>
      other.id !== article.id &&
      titleSimilarity(article.title, other.title) >= SIMILARITY_THRESHOLD
  );

  if (similarArticles.length === 0) {
    // Unique story — no duplicates, counts as first
    return true;
  }

  const articleTime = new Date(article.publishedAt).getTime();
  return similarArticles.every(
    (other) => new Date(other.publishedAt).getTime() >= articleTime
  );
}

// ─── Step 3: Penalties ──────────────────────────────────────

// Derivative headline → -15
const DERIVATIVE_HEADLINE_PATTERNS = [
  /\breacts?\s+to\b/i,
  /\bresponds?\s+to\b/i,
  /\bfollowing\s+news\b/i,
  /\bafter\s+reports?\b/i,
];

function hasDerivativeHeadline(title: string): boolean {
  return DERIVATIVE_HEADLINE_PATTERNS.some((p) => p.test(title));
}

// Content is mostly summarizing other sources → -10
// Detected by presence of attribution phrases without original quotes
const SUMMARIZING_PATTERNS = [
  /\baccording\s+to\s+reports?\b/i,
  /\breported\s+(by|from)\b/i,
  /\bsources?\s+say\b/i,
  /\bas\s+reported\s+by\b/i,
  /\bciting\s+(sources?|reports?)\b/i,
];

const ORIGINAL_REPORTING_PATTERNS = [
  /\bexclusive\b/i,
  /\bfirst reported\b/i,
  /\bscoop\b/i,
  /\binvestigation\b/i,
  /\btold\s+(me|us|this)\b/i,
  /\bin\s+an?\s+interview\b/i,
];

function isSummarizingOthers(title: string, content: string): boolean {
  const text = `${title} ${content}`.slice(0, 3000);
  const hasSummarizing = SUMMARIZING_PATTERNS.some((p) => p.test(text));
  const hasOriginal = ORIGINAL_REPORTING_PATTERNS.some((p) => p.test(text));
  // Only penalize if it has summarizing signals but no original reporting signals
  return hasSummarizing && !hasOriginal;
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
  isVip?: boolean;
}

export interface RankingResult {
  articleId: string;
  rankingScore: number;
  breakdown: {
    baseScore: number;
    exclusiveBonus: number;
    authorityVoiceBonus: number;
    financialMagnitudeBonus: number;
    broadImpactBonus: number;
    recencyBonus: number;
    vipBonus: number;
    firstToReportBonus: number;
    derivativePenalty: number;
    summarizingPenalty: number;
  };
}

// ─── Main Ranking Function ──────────────────────────────────

/**
 * Compute ranking scores for a batch of articles.
 * ranking_score = base_score + bonuses - penalties
 */
export function rankArticles(articles: RankableArticle[]): RankingResult[] {
  return articles.map((article) => {
    // Step 1: Base score by source tier
    const baseScore = getBaseScore(article.sourceTier);

    // Step 2: Bonuses
    const exclusiveBonus = hasExclusiveContent(article.title, article.content || "") ? 15 : 0;
    const authorityVoiceBonus = hasAuthorityVoice(article.title, article.content || "") ? 10 : 0;
    const financialMagnitudeBonus = hasFinancialMagnitude(article.title, article.content || "") ? 10 : 0;
    const broadImpactBonus = hasBroadImpact(article.title, article.content || "") ? 5 : 0;
    const recencyBonus = isRecentlyPublished(article.publishedAt) ? 5 : 0;
    const vipBonus = article.isVip ? 20 : 0;
    const firstToReportBonus = isFirstToReport(article, articles) ? 10 : 0;

    // Step 3: Penalties
    const derivativePenalty = hasDerivativeHeadline(article.title) ? 15 : 0;
    const summarizingPenalty = isSummarizingOthers(article.title, article.content || "") ? 10 : 0;

    // Step 4: Final score
    const totalBonuses = exclusiveBonus + authorityVoiceBonus + financialMagnitudeBonus +
      broadImpactBonus + recencyBonus + vipBonus + firstToReportBonus;
    const totalPenalties = derivativePenalty + summarizingPenalty;

    const rankingScore = baseScore + totalBonuses - totalPenalties;

    return {
      articleId: article.id,
      rankingScore,
      breakdown: {
        baseScore,
        exclusiveBonus,
        authorityVoiceBonus,
        financialMagnitudeBonus,
        broadImpactBonus,
        recencyBonus,
        vipBonus,
        firstToReportBonus,
        derivativePenalty,
        summarizingPenalty,
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
 * Fetches articles from the last 24 hours.
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

  // Fetch articles from the last 24 hours
  const since = new Date();
  since.setHours(since.getHours() - 24);

  const { data } = await supabase
    .from("articles")
    .select("id, title, content, url, topic, source_tier, published_at")
    .gte("published_at", since.toISOString())
    .order("published_at", { ascending: false })
    .limit(500);

  if (!data || data.length === 0) {
    return stats;
  }

  // Map to RankableArticle
  const articles: RankableArticle[] = data.map((row) => ({
    id: row.id as string,
    title: row.title as string,
    content: (row.content as string) || "",
    url: (row.url as string) || "",
    topic: (row.topic as string) || "",
    sourceTier: (row.source_tier as number) || 3,
    publishedAt: (row.published_at as string) || new Date().toISOString(),
  }));

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

/**
 * Re-score ALL articles in the database (not just last 24h).
 * Used for one-time re-ranking after algorithm changes.
 */
export async function rankAllArticles(): Promise<{
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

  // Fetch ALL articles in batches of 500
  const allArticles: RankableArticle[] = [];
  let offset = 0;
  const BATCH = 500;

  while (true) {
    const { data } = await supabase
      .from("articles")
      .select("id, title, content, url, topic, source_tier, published_at")
      .order("published_at", { ascending: false })
      .range(offset, offset + BATCH - 1);

    if (!data || data.length === 0) break;

    for (const row of data) {
      allArticles.push({
        id: row.id as string,
        title: row.title as string,
        content: (row.content as string) || "",
        url: (row.url as string) || "",
        topic: (row.topic as string) || "",
        sourceTier: (row.source_tier as number) || 3,
        publishedAt: (row.published_at as string) || new Date().toISOString(),
      });
    }

    if (data.length < BATCH) break;
    offset += BATCH;
  }

  if (allArticles.length === 0) {
    return stats;
  }

  // Compute rankings for all articles
  const results = rankArticles(allArticles);
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
      "*, summaries(brief, the_news, why_it_matters), article_intelligence(significance_score, story_type, watch_for_next), article_signals(id, signal_type, signal_label, entity_name, confidence, detected_at)"
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
