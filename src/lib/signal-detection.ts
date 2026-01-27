/**
 * Early Signal Detection
 *
 * Detects trends and stories before they go mainstream. Five signal types:
 *   1. First-Time Mentions — entity never seen before in the feed
 *   2. Tier 1 Before Mainstream — Tier 1 coverage without Tier 2/3 pickup
 *   3. Convergence Alert — 3+ Tier 1 sources on the same entity in 48h
 *   4. Unusual Activity — weekend filings, filing clusters, mention spikes
 *   5. Sentiment Shift — entity sentiment diverges from historical baseline
 *
 * Uses lightweight regex entity extraction (no Claude API calls).
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { MAJOR_COMPANIES, extractCompanyFromEdgarTitle } from "./sec-filter";
import type { SignalType, SentimentLabel } from "@/types";

// ─── Types ────────────────────────────────────────────────────

export interface ArticleForSignalDetection {
  id: string;
  title: string;
  content: string | null;
  url: string;
  sourceTier: number;
  sourceName: string;
  publishedAt: string;
  documentType: string | null;
}

interface DetectedEntity {
  name: string;
  type: "company" | "person" | "fund" | "keyword" | "organization";
}

interface EntityWithSentiment extends DetectedEntity {
  sentimentLabel: SentimentLabel;
  sentimentScore: number;
}

interface SignalInsert {
  article_id: string;
  signal_type: SignalType;
  signal_label: string;
  entity_name: string | null;
  confidence: number;
  metadata: Record<string, unknown>;
}

export interface SignalDetectionStats {
  entitiesRecorded: number;
  signalsDetected: number;
  byType: Record<string, number>;
  errors: number;
  durationMs: number;
}

// ─── Known Entity Lists ───────────────────────────────────────

const KNOWN_PEOPLE: string[] = [
  "Dario Amodei", "Sam Altman", "Jensen Huang", "Satya Nadella",
  "Sundar Pichai", "Mark Zuckerberg", "Tim Cook", "Jerome Powell",
  "Janet Yellen", "Jamie Dimon", "Ray Dalio", "Warren Buffett",
  "Larry Fink", "Marc Andreessen", "Vinod Khosla", "Ben Horowitz",
  "Keith Rabois", "Peter Thiel", "Masayoshi Son", "Xi Jinping",
  "Vladimir Putin", "Elon Musk", "Jeff Bezos", "Sergey Brin",
  "Larry Page", "Lisa Su",
];

const KNOWN_ORGANIZATIONS: string[] = [
  "Federal Reserve", "SEC", "DOJ", "Supreme Court",
  "European Commission", "FTC", "CFPB", "FDIC",
];

// Names that are common English words and need word-boundary matching
const NEEDS_WORD_BOUNDARY = new Set([
  "apple", "shell", "block", "square", "visa", "discord", "cruise",
  "uber", "accel", "oracle", "meta", "puck",
]);

// ─── Sentiment Word Lists ─────────────────────────────────────

const POSITIVE_WORDS = new Set([
  "growth", "profit", "surge", "soar", "rally", "beat", "exceed",
  "strong", "gain", "record", "bullish", "upgrade", "outperform",
  "innovation", "breakthrough", "partnership", "expansion", "launch",
  "milestone", "success", "boost", "optimistic", "confident",
  "recovery", "momentum", "upside", "impressive", "transformative",
  "revenue", "earnings",
]);

const NEGATIVE_WORDS = new Set([
  "loss", "decline", "crash", "plunge", "miss", "fail", "weak",
  "bearish", "downgrade", "underperform", "layoff", "cut", "warning",
  "lawsuit", "investigation", "scandal", "fraud", "default", "crisis",
  "bankrupt", "recall", "breach", "fine", "penalty", "concern",
  "risk", "threat", "probe", "resign", "collapse", "slump",
  "downturn", "setback", "trouble", "exodus", "shortfall",
]);

// ─── Entity Extraction ────────────────────────────────────────

interface EntityDictionary {
  entries: Map<string, DetectedEntity>; // lowercase name -> entity
  wordBoundaryEntries: Map<string, DetectedEntity>; // need regex match
}

/**
 * Build the entity dictionary from all sources.
 */
async function buildEntityDictionary(): Promise<EntityDictionary> {
  const entries = new Map<string, DetectedEntity>();
  const wordBoundaryEntries = new Map<string, DetectedEntity>();

  // Add major companies
  for (const name of MAJOR_COMPANIES) {
    const lower = name.toLowerCase();
    const entity: DetectedEntity = { name, type: "company" };
    if (NEEDS_WORD_BOUNDARY.has(lower)) {
      wordBoundaryEntries.set(lower, entity);
    } else {
      entries.set(lower, entity);
    }
  }

  // Add known people
  for (const name of KNOWN_PEOPLE) {
    entries.set(name.toLowerCase(), { name, type: "person" });
  }

  // Add known organizations
  for (const name of KNOWN_ORGANIZATIONS) {
    entries.set(name.toLowerCase(), { name, type: "organization" });
  }

  // Add watchlist items from Supabase
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase
        .from("watchlist")
        .select("name, type");

      if (data) {
        for (const item of data) {
          const lower = (item.name as string).toLowerCase();
          const entityType = item.type as DetectedEntity["type"];
          const entity: DetectedEntity = { name: item.name, type: entityType };
          if (NEEDS_WORD_BOUNDARY.has(lower)) {
            wordBoundaryEntries.set(lower, entity);
          } else {
            entries.set(lower, entity);
          }
        }
      }
    } catch (error) {
      console.error("[Signals] Failed to load watchlist:", error);
    }
  }

  return { entries, wordBoundaryEntries };
}

/**
 * Extract entities from article text using keyword matching.
 */
function extractEntitiesFromText(
  title: string,
  content: string | null,
  dict: EntityDictionary
): DetectedEntity[] {
  const text = `${title} ${(content || "").slice(0, 2000)}`.toLowerCase();
  const found = new Map<string, DetectedEntity>();

  // Check standard entries (simple includes)
  for (const [lower, entity] of dict.entries) {
    if (lower.length >= 3 && text.includes(lower)) {
      found.set(lower, entity);
    }
  }

  // Check word-boundary entries (regex)
  for (const [lower, entity] of dict.wordBoundaryEntries) {
    const regex = new RegExp(`\\b${escapeRegex(lower)}\\b`, "i");
    if (regex.test(text)) {
      found.set(lower, entity);
    }
  }

  return Array.from(found.values());
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Sentiment Analysis ───────────────────────────────────────

/**
 * Compute sentiment for an entity mention using keyword analysis
 * in a 300-char window around the entity.
 */
function computeSentiment(
  text: string,
  entityName: string
): { label: SentimentLabel; score: number } {
  const lower = text.toLowerCase();
  const entityLower = entityName.toLowerCase();
  const idx = lower.indexOf(entityLower);

  // Extract 300-char window around the mention
  const windowStart = Math.max(0, idx - 150);
  const windowEnd = Math.min(lower.length, idx + entityName.length + 150);
  const window = idx >= 0 ? lower.slice(windowStart, windowEnd) : lower.slice(0, 500);

  const words = window.split(/\W+/);
  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) positiveCount++;
    if (NEGATIVE_WORDS.has(word)) negativeCount++;
  }

  const total = positiveCount + negativeCount;
  const score = total > 0 ? (positiveCount - negativeCount) / total : 0;

  let label: SentimentLabel = "neutral";
  if (score > 0.2) label = "positive";
  else if (score < -0.2) label = "negative";

  return { label, score: Math.round(score * 100) / 100 };
}

// ─── Entity History Recording ─────────────────────────────────

/**
 * Record entity mentions for a batch of articles.
 * Returns the extracted entities per article for use by detectors.
 */
async function recordEntityMentions(
  articles: ArticleForSignalDetection[],
  dict: EntityDictionary
): Promise<{
  articleEntities: Map<string, EntityWithSentiment[]>;
  recorded: number;
  errors: number;
}> {
  const articleEntities = new Map<string, EntityWithSentiment[]>();
  const rows: Record<string, unknown>[] = [];

  for (const article of articles) {
    const entities = extractEntitiesFromText(article.title, article.content, dict);
    const text = `${article.title} ${(article.content || "").slice(0, 2000)}`;

    const withSentiment: EntityWithSentiment[] = entities.map((e) => {
      const { label, score } = computeSentiment(text, e.name);
      return { ...e, sentimentLabel: label, sentimentScore: score };
    });

    articleEntities.set(article.id, withSentiment);

    for (const entity of withSentiment) {
      rows.push({
        entity_name: entity.name.toLowerCase(),
        entity_type: entity.type,
        article_id: article.id,
        source_tier: article.sourceTier,
        source_name: article.sourceName,
        sentiment_label: entity.sentimentLabel,
        sentiment_score: entity.sentimentScore,
        detected_at: article.publishedAt,
      });
    }
  }

  let recorded = 0;
  let errors = 0;

  if (isSupabaseConfigured() && supabase && rows.length > 0) {
    // Batch upsert in groups of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      try {
        const { error } = await supabase
          .from("entity_history")
          .upsert(batch, { onConflict: "article_id,entity_name", ignoreDuplicates: true });

        if (error) {
          console.error("[Signals] Entity history upsert error:", error.message);
          errors += batch.length;
        } else {
          recorded += batch.length;
        }
      } catch {
        errors += batch.length;
      }
    }
  }

  return { articleEntities, recorded, errors };
}

// ─── Signal 1: First-Time Mentions ────────────────────────────

async function detectFirstMentions(
  articleIds: string[],
  articleEntities: Map<string, EntityWithSentiment[]>
): Promise<SignalInsert[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  // Collect all unique entity names from current batch
  const batchEntities = new Set<string>();
  for (const entities of articleEntities.values()) {
    for (const e of entities) {
      batchEntities.add(e.name.toLowerCase());
    }
  }

  if (batchEntities.size === 0) return [];

  // Query for any prior mentions of these entities (excluding current batch)
  const { data: priorMentions } = await supabase
    .from("entity_history")
    .select("entity_name")
    .in("entity_name", Array.from(batchEntities))
    .not("article_id", "in", `(${articleIds.join(",")})`)
    .limit(1000);

  const previouslySeen = new Set(
    (priorMentions || []).map((r) => (r.entity_name as string))
  );

  // Entities NOT in previouslySeen are first-time
  const signals: SignalInsert[] = [];
  for (const [articleId, entities] of articleEntities) {
    for (const entity of entities) {
      const lower = entity.name.toLowerCase();
      if (!previouslySeen.has(lower)) {
        signals.push({
          article_id: articleId,
          signal_type: "first_mention",
          signal_label: "New to your radar",
          entity_name: entity.name,
          confidence: MAJOR_COMPANIES.map((c) => c.toLowerCase()).includes(lower) ||
                      KNOWN_PEOPLE.map((p) => p.toLowerCase()).includes(lower)
            ? 0.9 : 0.7,
          metadata: { entityType: entity.type },
        });
      }
    }
  }

  return signals;
}

// ─── Signal 2: Tier 1 Before Mainstream ───────────────────────

async function detectTier1BeforeMainstream(
  articleIds: string[],
  articles: ArticleForSignalDetection[],
  articleEntities: Map<string, EntityWithSentiment[]>
): Promise<SignalInsert[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  // Only consider Tier 1 articles
  const tier1Articles = articles.filter((a) => a.sourceTier === 1);
  if (tier1Articles.length === 0) return [];

  // Collect entities from Tier 1 articles
  const tier1Entities = new Set<string>();
  for (const article of tier1Articles) {
    const entities = articleEntities.get(article.id) || [];
    for (const e of entities) {
      tier1Entities.add(e.name.toLowerCase());
    }
  }

  if (tier1Entities.size === 0) return [];

  // Check if any Tier 2/3 source covered these entities in last 48h
  const since = new Date();
  since.setHours(since.getHours() - 48);

  const { data: mainstreamCoverage } = await supabase
    .from("entity_history")
    .select("entity_name, source_tier")
    .in("entity_name", Array.from(tier1Entities))
    .in("source_tier", [2, 3])
    .gte("detected_at", since.toISOString())
    .not("article_id", "in", `(${articleIds.join(",")})`)
    .limit(1000);

  const coveredByMainstream = new Set(
    (mainstreamCoverage || []).map((r) => (r.entity_name as string))
  );

  // Tier 1 entities NOT covered by mainstream → early signal
  const signals: SignalInsert[] = [];
  for (const article of tier1Articles) {
    const entities = articleEntities.get(article.id) || [];
    for (const entity of entities) {
      const lower = entity.name.toLowerCase();
      if (!coveredByMainstream.has(lower)) {
        signals.push({
          article_id: article.id,
          signal_type: "tier1_before_mainstream",
          signal_label: "Early signal",
          entity_name: entity.name,
          confidence: 0.85,
          metadata: { sourceName: article.sourceName, sourceTier: article.sourceTier },
        });
      }
    }
  }

  return signals;
}

// ─── Signal 3: Convergence Alert ──────────────────────────────

async function detectConvergence(
  articleIds: string[],
  articleEntities: Map<string, EntityWithSentiment[]>
): Promise<SignalInsert[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const since = new Date();
  since.setHours(since.getHours() - 48);

  // Query Tier 1 entity mentions in last 48h
  const { data: tier1Mentions } = await supabase
    .from("entity_history")
    .select("entity_name, source_name")
    .eq("source_tier", 1)
    .gte("detected_at", since.toISOString())
    .limit(2000);

  if (!tier1Mentions || tier1Mentions.length === 0) return [];

  // Group by entity, count distinct sources
  const entitySourceMap = new Map<string, Set<string>>();
  for (const row of tier1Mentions) {
    const entity = row.entity_name as string;
    const source = row.source_name as string;
    if (!entitySourceMap.has(entity)) {
      entitySourceMap.set(entity, new Set());
    }
    entitySourceMap.get(entity)!.add(source);
  }

  // Find entities with 3+ distinct Tier 1 sources
  const convergingEntities = new Map<string, string[]>();
  for (const [entity, sources] of entitySourceMap) {
    if (sources.size >= 3) {
      convergingEntities.set(entity, Array.from(sources));
    }
  }

  if (convergingEntities.size === 0) return [];

  // Only emit signals for articles in the current batch
  const signals: SignalInsert[] = [];
  for (const [articleId, entities] of articleEntities) {
    if (!articleIds.includes(articleId)) continue;
    for (const entity of entities) {
      const lower = entity.name.toLowerCase();
      const sources = convergingEntities.get(lower);
      if (sources) {
        signals.push({
          article_id: articleId,
          signal_type: "convergence",
          signal_label: "Building momentum",
          entity_name: entity.name,
          confidence: Math.min(1.0, sources.length / 5),
          metadata: { tier1Sources: sources, sourceCount: sources.length },
        });
      }
    }
  }

  return signals;
}

// ─── Signal 4: Unusual Activity ───────────────────────────────

async function detectUnusualActivity(
  articles: ArticleForSignalDetection[],
  articleEntities: Map<string, EntityWithSentiment[]>
): Promise<SignalInsert[]> {
  const signals: SignalInsert[] = [];

  // 4a. Weekend/Holiday SEC Filing
  for (const article of articles) {
    if (article.documentType === "8-K") {
      const pubDate = new Date(article.publishedAt);
      const dayOfWeek = pubDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        const companyName = extractCompanyFromEdgarTitle(article.title);
        signals.push({
          article_id: article.id,
          signal_type: "unusual_activity",
          signal_label: "Unusual activity",
          entity_name: companyName || article.title.slice(0, 50),
          confidence: 0.9,
          metadata: {
            reason: "Weekend 8-K filing",
            dayOfWeek: dayOfWeek === 0 ? "Sunday" : "Saturday",
            documentType: "8-K",
          },
        });
      }
    }
  }

  // 4b. Multiple filings from same company in 7 days
  if (isSupabaseConfigured() && supabase) {
    const docArticles = articles.filter((a) => a.documentType);
    if (docArticles.length > 0) {
      const companyNames = new Set<string>();
      const companyToArticle = new Map<string, string>();

      for (const article of docArticles) {
        const name = extractCompanyFromEdgarTitle(article.title);
        if (name) {
          const lower = name.toLowerCase();
          companyNames.add(lower);
          companyToArticle.set(lower, article.id);
        }
      }

      if (companyNames.size > 0) {
        const since7d = new Date();
        since7d.setDate(since7d.getDate() - 7);

        // Count recent filings per entity that appear in articles with document_type
        const { data: recentFilings } = await supabase
          .from("entity_history")
          .select("entity_name, article_id")
          .in("entity_name", Array.from(companyNames))
          .gte("detected_at", since7d.toISOString())
          .limit(500);

        if (recentFilings) {
          const filingCounts = new Map<string, number>();
          for (const row of recentFilings) {
            const name = row.entity_name as string;
            filingCounts.set(name, (filingCounts.get(name) || 0) + 1);
          }

          for (const [entityName, count] of filingCounts) {
            if (count >= 3) {
              const articleId = companyToArticle.get(entityName);
              if (articleId) {
                signals.push({
                  article_id: articleId,
                  signal_type: "unusual_activity",
                  signal_label: "Unusual activity",
                  entity_name: entityName,
                  confidence: 0.7,
                  metadata: {
                    reason: "Multiple filings in 7 days",
                    filingCount: count,
                    window: "7 days",
                  },
                });
              }
            }
          }
        }
      }
    }

    // 4c. Mention spike vs 14-day baseline
    const allEntities = new Set<string>();
    for (const entities of articleEntities.values()) {
      for (const e of entities) {
        allEntities.add(e.name.toLowerCase());
      }
    }

    if (allEntities.size > 0) {
      const since14d = new Date();
      since14d.setDate(since14d.getDate() - 14);
      const since24h = new Date();
      since24h.setHours(since24h.getHours() - 24);

      // Get daily counts for the last 14 days
      const { data: historicalMentions } = await supabase
        .from("entity_history")
        .select("entity_name, detected_at")
        .in("entity_name", Array.from(allEntities))
        .gte("detected_at", since14d.toISOString())
        .limit(5000);

      if (historicalMentions && historicalMentions.length > 0) {
        // Group by entity and date
        const entityDailyCounts = new Map<string, Map<string, number>>();
        const entityTodayCounts = new Map<string, number>();
        const todayStr = new Date().toISOString().slice(0, 10);

        for (const row of historicalMentions) {
          const entity = row.entity_name as string;
          const date = (row.detected_at as string).slice(0, 10);

          if (!entityDailyCounts.has(entity)) {
            entityDailyCounts.set(entity, new Map());
          }
          const dailyMap = entityDailyCounts.get(entity)!;
          dailyMap.set(date, (dailyMap.get(date) || 0) + 1);

          // Count today's mentions
          if (date === todayStr) {
            entityTodayCounts.set(entity, (entityTodayCounts.get(entity) || 0) + 1);
          }
        }

        // Compute baseline (excluding today) and detect spikes
        for (const [entity, dailyMap] of entityDailyCounts) {
          const todayCount = entityTodayCounts.get(entity) || 0;
          if (todayCount < 3) continue; // Need at least 3 mentions to flag

          // Get baseline days (excluding today)
          const baselineCounts: number[] = [];
          for (const [date, count] of dailyMap) {
            if (date !== todayStr) {
              baselineCounts.push(count);
            }
          }

          if (baselineCounts.length < 3) continue; // Need baseline data

          const avg = baselineCounts.reduce((a, b) => a + b, 0) / baselineCounts.length;
          const variance = baselineCounts.reduce((sum, c) => sum + (c - avg) ** 2, 0) / baselineCounts.length;
          const stddev = Math.sqrt(variance);
          const threshold = avg + 2 * stddev;

          if (todayCount > threshold && threshold > 0) {
            // Find an article from current batch that mentions this entity
            for (const [articleId, entities] of articleEntities) {
              if (entities.some((e) => e.name.toLowerCase() === entity)) {
                signals.push({
                  article_id: articleId,
                  signal_type: "unusual_activity",
                  signal_label: "Unusual activity",
                  entity_name: entity,
                  confidence: Math.min(1.0, todayCount / (avg * 3 || 1)),
                  metadata: {
                    reason: "Mention spike",
                    todayCount,
                    baselineAvg: Math.round(avg * 100) / 100,
                    baselineStddev: Math.round(stddev * 100) / 100,
                    threshold: Math.round(threshold * 100) / 100,
                  },
                });
                break; // One signal per entity
              }
            }
          }
        }
      }
    }
  }

  return signals;
}

// ─── Signal 5: Sentiment Shift ────────────────────────────────

async function detectSentimentShift(
  articleIds: string[],
  articleEntities: Map<string, EntityWithSentiment[]>
): Promise<SignalInsert[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  // Collect entities from current batch with their current sentiment
  const currentSentiments = new Map<string, { score: number; articleId: string; entityName: string }>();
  for (const [articleId, entities] of articleEntities) {
    for (const entity of entities) {
      const lower = entity.name.toLowerCase();
      if (!currentSentiments.has(lower)) {
        currentSentiments.set(lower, {
          score: entity.sentimentScore,
          articleId,
          entityName: entity.name,
        });
      }
    }
  }

  if (currentSentiments.size === 0) return [];

  // Query historical sentiment for these entities (last 7 days, excluding current batch)
  const since7d = new Date();
  since7d.setDate(since7d.getDate() - 7);

  const { data: historicalSentiment } = await supabase
    .from("entity_history")
    .select("entity_name, sentiment_score")
    .in("entity_name", Array.from(currentSentiments.keys()))
    .not("article_id", "in", `(${articleIds.join(",")})`)
    .gte("detected_at", since7d.toISOString())
    .limit(2000);

  if (!historicalSentiment || historicalSentiment.length === 0) return [];

  // Compute average historical sentiment per entity
  const entityHistory = new Map<string, { scores: number[]; avg: number }>();
  for (const row of historicalSentiment) {
    const entity = row.entity_name as string;
    const score = row.sentiment_score as number;
    if (!entityHistory.has(entity)) {
      entityHistory.set(entity, { scores: [], avg: 0 });
    }
    entityHistory.get(entity)!.scores.push(score);
  }

  for (const [entity, data] of entityHistory) {
    data.avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
  }

  // Detect shifts
  const signals: SignalInsert[] = [];
  const SHIFT_THRESHOLD = 0.4;
  const MIN_HISTORY = 3;

  for (const [entityLower, current] of currentSentiments) {
    const history = entityHistory.get(entityLower);
    if (!history || history.scores.length < MIN_HISTORY) continue;

    const shift = current.score - history.avg;
    if (Math.abs(shift) >= SHIFT_THRESHOLD) {
      let direction: string;
      if (shift > 0 && history.avg <= 0) direction = "negative_to_positive";
      else if (shift < 0 && history.avg >= 0) direction = "positive_to_negative";
      else if (shift > 0) direction = "neutral_to_positive";
      else direction = "neutral_to_negative";

      signals.push({
        article_id: current.articleId,
        signal_type: "sentiment_shift",
        signal_label: "Sentiment shift",
        entity_name: current.entityName,
        confidence: Math.min(1.0, Math.abs(shift)),
        metadata: {
          previousAvgSentiment: Math.round(history.avg * 100) / 100,
          currentSentiment: current.score,
          direction,
          historicalMentions: history.scores.length,
        },
      });
    }
  }

  return signals;
}

// ─── Store Signals ────────────────────────────────────────────

async function storeSignals(
  signals: SignalInsert[]
): Promise<{ stored: number; errors: number }> {
  const stats = { stored: 0, errors: 0 };
  if (!isSupabaseConfigured() || !supabase || signals.length === 0) return stats;

  // Batch upsert in groups of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < signals.length; i += BATCH_SIZE) {
    const batch = signals.slice(i, i + BATCH_SIZE);
    try {
      const { error } = await supabase
        .from("article_signals")
        .upsert(batch, {
          onConflict: "article_id,signal_type,entity_name",
          ignoreDuplicates: true,
        });

      if (error) {
        console.error("[Signals] Store error:", error.message);
        stats.errors += batch.length;
      } else {
        stats.stored += batch.length;
      }
    } catch {
      stats.errors += batch.length;
    }
  }

  return stats;
}

// ─── Main Orchestrator ────────────────────────────────────────

/**
 * Run all signal detection on a batch of recently ingested articles.
 * Zero Claude API calls — uses regex entity extraction and keyword sentiment.
 */
export async function detectSignals(
  articles: ArticleForSignalDetection[]
): Promise<SignalDetectionStats> {
  const startTime = Date.now();
  const stats: SignalDetectionStats = {
    entitiesRecorded: 0,
    signalsDetected: 0,
    byType: {},
    errors: 0,
    durationMs: 0,
  };

  if (articles.length === 0) {
    stats.durationMs = Date.now() - startTime;
    return stats;
  }

  try {
    // 1. Build entity dictionary
    const dict = await buildEntityDictionary();

    // 2. Extract entities + compute sentiment, record in entity_history
    const { articleEntities, recorded, errors: recordErrors } =
      await recordEntityMentions(articles, dict);
    stats.entitiesRecorded = recorded;
    stats.errors += recordErrors;

    const articleIds = articles.map((a) => a.id);

    // 3. Run all 5 detectors in parallel
    const [firstMentions, tier1Signals, convergence, unusual, sentiment] =
      await Promise.all([
        detectFirstMentions(articleIds, articleEntities),
        detectTier1BeforeMainstream(articleIds, articles, articleEntities),
        detectConvergence(articleIds, articleEntities),
        detectUnusualActivity(articles, articleEntities),
        detectSentimentShift(articleIds, articleEntities),
      ]);

    const allSignals = [
      ...firstMentions,
      ...tier1Signals,
      ...convergence,
      ...unusual,
      ...sentiment,
    ];

    // 4. Store signals
    const { stored, errors: storeErrors } = await storeSignals(allSignals);
    stats.signalsDetected = stored;
    stats.errors += storeErrors;

    // Count by type
    for (const signal of allSignals) {
      stats.byType[signal.signal_type] = (stats.byType[signal.signal_type] || 0) + 1;
    }

    console.log(
      `[Signals] Detected ${allSignals.length} signals for ${articles.length} articles ` +
      `(${recorded} entity mentions recorded)`
    );
  } catch (error) {
    console.error("[Signals] Detection error:", error);
    stats.errors++;
  }

  stats.durationMs = Date.now() - startTime;
  return stats;
}
