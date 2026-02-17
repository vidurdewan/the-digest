import { createHash } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { isClaudeConfigured } from "@/lib/claude";
import { checkBudget, recordUsage } from "@/lib/cost-tracker";
import {
  supabaseAdmin as supabase,
  isSupabaseAdminConfigured as isSupabaseConfigured,
} from "@/lib/supabase";
import type {
  ContinuityDepth,
  SinceLastReadBrief,
  SinceLastReadHighlight,
  SinceLastReadPayload,
  TopicCategory,
} from "@/types";

const DEFAULT_DEPTH: ContinuityDepth = "2m";
const DEFAULT_LOOKBACK_HOURS = 24;
const SNAPSHOT_TTL_MS = 15 * 60 * 1000;
const SNAPSHOT_RETENTION_DAYS = 14;

const DEPTH_CONFIG: Record<
  ContinuityDepth,
  {
    highlightLimit: number;
    citationLimit: number;
    maxTokens: number;
    maxSourceArticles: number;
    changedBulletLimit: number;
    watchNextLimit: number;
  }
> = {
  "2m": {
    highlightLimit: 4,
    citationLimit: 4,
    maxTokens: 600,
    maxSourceArticles: 5,
    changedBulletLimit: 3,
    watchNextLimit: 2,
  },
  "10m": {
    highlightLimit: 8,
    citationLimit: 8,
    maxTokens: 1000,
    maxSourceArticles: 10,
    changedBulletLimit: 5,
    watchNextLimit: 3,
  },
  deep: {
    highlightLimit: 12,
    citationLimit: 12,
    maxTokens: 1600,
    maxSourceArticles: 14,
    changedBulletLimit: 7,
    watchNextLimit: 5,
  },
};

const ENGAGEMENT_WEIGHTS: Record<string, number> = {
  click: 1,
  expand: 2,
  read: 3,
  share: 4,
  save: 5,
};

const REACTION_WEIGHTS: Record<string, number> = {
  useful: 1.25,
  surprising: 1.5,
  already_knew: -0.4,
  bad_connection: -1,
  not_important: -2,
};

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic | null {
  if (anthropicClient) return anthropicClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  anthropicClient = new Anthropic({ apiKey });
  return anthropicClient;
}

function normalizeDepth(depth: string | null | undefined): ContinuityDepth {
  if (depth === "2m" || depth === "10m" || depth === "deep") return depth;
  return DEFAULT_DEPTH;
}

function normalizeClientId(clientId: string | null | undefined): string {
  const raw = (clientId || "").trim();
  if (!raw) return "anonymous";
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120);
  return safe.length > 0 ? safe : "anonymous";
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function extractSourceFromUrl(url: string | null): string {
  if (!url) return "Unknown";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Unknown";
  }
}

function getWatchlistMatches(
  searchText: string,
  watchlistTerms: string[]
): string[] {
  if (watchlistTerms.length === 0) return [];

  const lower = searchText.toLowerCase();
  const matches: string[] = [];

  for (const term of watchlistTerms) {
    const needle = term.toLowerCase();
    if (!needle) continue;

    if (needle.length < 4) {
      const regex = new RegExp(`\\b${escapeRegex(needle)}\\b`, "i");
      if (regex.test(lower)) matches.push(term);
      continue;
    }

    if (lower.includes(needle)) matches.push(term);
  }

  return matches;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeTitleForThread(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .slice(0, 7)
    .join(" ");
}

function computeRecencyScore(publishedAt: string): number {
  const publishedMs = new Date(publishedAt).getTime();
  if (Number.isNaN(publishedMs)) return 0;

  const ageHours = (Date.now() - publishedMs) / (1000 * 60 * 60);
  if (ageHours <= 1) return 3;
  if (ageHours <= 6) return 2.4;
  if (ageHours <= 12) return 1.8;
  if (ageHours <= 24) return 1.2;
  if (ageHours <= 72) return 0.8;
  return 0.3;
}

interface ContinuityStateRow {
  client_id: string;
  last_seen_at: string | null;
  preferred_depth: ContinuityDepth;
}

interface DbSummaryRow {
  brief: string | null;
  the_news: string | null;
  why_it_matters: string | null;
  the_context: string | null;
  key_entities: Array<{ name?: string }> | null;
}

interface DbIntelligenceRow {
  significance_score: number | null;
  story_type: string | null;
  story_thread_id: string | null;
  watch_for_next: string | null;
}

interface DbArticleRow {
  id: string;
  title: string;
  url: string | null;
  topic: TopicCategory;
  content: string | null;
  published_at: string;
  summaries: DbSummaryRow | DbSummaryRow[] | null;
  article_intelligence: DbIntelligenceRow | DbIntelligenceRow[] | null;
}

interface DbReactionRow {
  article_id: string;
  reaction: string;
}

interface RawCandidate {
  articleId: string;
  title: string;
  sourceUrl: string;
  source: string;
  topic: TopicCategory;
  publishedAt: string;
  significanceScore: number;
  watchForNext?: string;
  summaryText: string;
  searchText: string;
  reactions: string[];
  threadKey: string;
}

interface RankedCandidate extends RawCandidate {
  watchlistMatches: string[];
  reason: string;
  score: number;
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
}

function buildSummaryText(summary: DbSummaryRow | null, content: string | null): string {
  const summaryBits = [
    summary?.brief || "",
    summary?.the_news || "",
    summary?.why_it_matters || "",
    summary?.the_context || "",
  ]
    .filter(Boolean)
    .join(" ");

  if (summaryBits.length > 0) return summaryBits;
  return (content || "").slice(0, 500);
}

function buildSearchText(
  title: string,
  source: string,
  content: string | null,
  summary: DbSummaryRow | null
): string {
  const entities = (summary?.key_entities || [])
    .map((entity) => entity?.name || "")
    .filter(Boolean)
    .join(" ");

  return [title, source, content || "", buildSummaryText(summary, content), entities]
    .join(" ")
    .toLowerCase();
}

function makeSnapshotHash(
  clientId: string,
  depth: ContinuityDepth,
  sinceAtIso: string,
  articleIds: string[]
): string {
  const hash = createHash("sha256");
  hash.update(clientId);
  hash.update("|");
  hash.update(depth);
  hash.update("|");
  hash.update(sinceAtIso);
  hash.update("|");
  hash.update(articleIds.join(","));
  return hash.digest("hex").slice(0, 24);
}

function pickReason(
  candidate: RawCandidate,
  watchlistMatches: string[],
  topicBoost: number,
  reactionBoost: number
): string {
  if (watchlistMatches.length > 0) {
    return `Tracks your watchlist: ${watchlistMatches[0]}`;
  }
  if (candidate.significanceScore >= 8) {
    return "High-significance development";
  }
  if (reactionBoost >= 1) {
    return "Similar stories were marked useful";
  }
  if (topicBoost >= 1.2) {
    return `Aligned with your reading focus in ${candidate.topic}`;
  }
  return "Important recent update";
}

function buildFallbackBrief(
  highlights: SinceLastReadHighlight[],
  unchangedTitles: string[],
  depth: ContinuityDepth,
  newArticles: number,
  lastSeenAt: string | null
): SinceLastReadBrief {
  const config = DEPTH_CONFIG[depth];
  const sinceLabel = lastSeenAt
    ? `since ${new Date(lastSeenAt).toLocaleString()}`
    : "in the last 24 hours";

  const headline =
    newArticles > 0
      ? `${newArticles} new ${newArticles === 1 ? "story" : "stories"} ${sinceLabel}`
      : `No major new updates ${sinceLabel}`;

  const top = highlights[0];
  const summary = top
    ? `${top.title} leads the change set, followed by ${highlights
        .slice(1, 3)
        .map((item) => item.source)
        .join(", ") || "broader coverage shifts"}.`
    : "You are caught up. No meaningful deltas were detected in your tracked feed.";

  const changed = highlights
    .slice(0, config.changedBulletLimit)
    .map((item, index) => `${index + 1}. ${item.title} (${item.source})`);

  const unchanged = unchangedTitles
    .slice(0, 3)
    .map((title) => `Still in play: ${title}`);

  const watchNext = highlights
    .map((item) => item.watchForNext)
    .filter((value): value is string => Boolean(value))
    .slice(0, config.watchNextLimit);

  return {
    headline,
    summary,
    changed,
    unchanged,
    watchNext,
  };
}

function validateBriefShape(
  parsed: unknown,
  fallback: SinceLastReadBrief
): SinceLastReadBrief {
  if (!parsed || typeof parsed !== "object") return fallback;
  const obj = parsed as Record<string, unknown>;

  const asString = (value: unknown, fallbackText: string): string =>
    typeof value === "string" && value.trim().length > 0 ? value.trim() : fallbackText;

  const asStringArray = (value: unknown, fallbackValues: string[]): string[] => {
    if (!Array.isArray(value)) return fallbackValues;
    const mapped = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);
    return mapped.length > 0 ? mapped : fallbackValues;
  };

  return {
    headline: asString(obj.headline, fallback.headline),
    summary: asString(obj.summary, fallback.summary),
    changed: asStringArray(obj.changed, fallback.changed),
    unchanged: asStringArray(obj.unchanged, fallback.unchanged),
    watchNext: asStringArray(obj.watchNext, fallback.watchNext),
  };
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) return null;

    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

async function fetchOrCreateContinuityState(
  clientId: string
): Promise<ContinuityStateRow> {
  const fallback: ContinuityStateRow = {
    client_id: clientId,
    last_seen_at: null,
    preferred_depth: DEFAULT_DEPTH,
  };

  if (!isSupabaseConfigured() || !supabase) return fallback;

  const { data, error } = await supabase
    .from("continuity_state")
    .select("client_id, last_seen_at, preferred_depth")
    .eq("client_id", clientId)
    .maybeSingle();

  if (data && !error) {
    return {
      client_id: data.client_id,
      last_seen_at: data.last_seen_at,
      preferred_depth: normalizeDepth(data.preferred_depth),
    };
  }

  if (error && error.code !== "PGRST116") {
    console.error("[Continuity] Failed to fetch continuity_state:", error.message);
    return fallback;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("continuity_state")
    .insert({ client_id: clientId, preferred_depth: DEFAULT_DEPTH })
    .select("client_id, last_seen_at, preferred_depth")
    .single();

  if (insertError || !inserted) {
    if (insertError) {
      console.error("[Continuity] Failed to create continuity_state:", insertError.message);
    }
    return fallback;
  }

  return {
    client_id: inserted.client_id,
    last_seen_at: inserted.last_seen_at,
    preferred_depth: normalizeDepth(inserted.preferred_depth),
  };
}

async function loadWatchlistTerms(): Promise<string[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from("watchlist")
    .select("name")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[Continuity] Failed to load watchlist:", error.message);
    return [];
  }

  const seen = new Set<string>();
  const terms: string[] = [];

  for (const row of data || []) {
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) continue;
    const lower = name.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    terms.push(name);
  }

  return terms;
}

async function loadTopicEngagementScores(): Promise<Record<string, number>> {
  if (!isSupabaseConfigured() || !supabase) return {};

  const { data, error } = await supabase
    .from("engagement")
    .select("event_type, articles(topic)")
    .order("created_at", { ascending: false })
    .limit(1200);

  if (error) {
    console.error("[Continuity] Failed to load engagement scores:", error.message);
    return {};
  }

  const scores: Record<string, number> = {};

  for (const row of data || []) {
    const topic =
      (row.articles as { topic?: string } | null)?.topic || "unknown";
    const weight = ENGAGEMENT_WEIGHTS[row.event_type] || 1;
    scores[topic] = (scores[topic] || 0) + weight;
  }

  return scores;
}

async function fetchDeltaArticles(sinceAtIso: string): Promise<RawCandidate[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const selectQuery =
    "id, title, url, topic, content, published_at, summaries(brief, the_news, why_it_matters, the_context, key_entities), article_intelligence(significance_score, story_type, story_thread_id, watch_for_next)";

  let rows: DbArticleRow[] = [];

  const { data, error } = await supabase
    .from("articles")
    .select(selectQuery)
    .gte("published_at", sinceAtIso)
    .order("published_at", { ascending: false })
    .limit(220);

  if (error) {
    if (error.message.includes("relationship")) {
      const fallback = await supabase
        .from("articles")
        .select("id, title, url, topic, content, published_at")
        .gte("published_at", sinceAtIso)
        .order("published_at", { ascending: false })
        .limit(220);

      if (fallback.error) {
        console.error("[Continuity] Failed to fetch articles:", fallback.error.message);
        return [];
      }

      rows = (fallback.data || []).map((row) => ({
        ...row,
        summaries: null,
        article_intelligence: null,
      })) as DbArticleRow[];
    } else {
      console.error("[Continuity] Failed to fetch delta articles:", error.message);
      return [];
    }
  } else {
    rows = (data || []) as DbArticleRow[];
  }

  if (rows.length === 0) return [];

  const articleIds = rows.map((row) => row.id);
  const reactionsByArticle = new Map<string, string[]>();

  const { data: reactionRows } = await supabase
    .from("article_reactions")
    .select("article_id, reaction")
    .in("article_id", articleIds)
    .limit(2000);

  for (const reaction of (reactionRows || []) as DbReactionRow[]) {
    const existing = reactionsByArticle.get(reaction.article_id) || [];
    existing.push(reaction.reaction);
    reactionsByArticle.set(reaction.article_id, existing);
  }

  return rows.map((row) => {
    const summary = firstOrNull(row.summaries);
    const intelligence = firstOrNull(row.article_intelligence);
    const source = extractSourceFromUrl(row.url);

    const summaryText = buildSummaryText(summary, row.content);
    const searchText = buildSearchText(row.title, source, row.content, summary);

    const threadKey =
      intelligence?.story_thread_id || normalizeTitleForThread(row.title) || row.id;

    return {
      articleId: row.id,
      title: row.title,
      sourceUrl: row.url || "",
      source,
      topic: row.topic,
      publishedAt: row.published_at,
      significanceScore: clamp(intelligence?.significance_score || 5, 1, 10),
      watchForNext: intelligence?.watch_for_next || undefined,
      summaryText,
      searchText,
      reactions: reactionsByArticle.get(row.id) || [],
      threadKey,
    };
  });
}

async function fetchUnchangedContext(
  sinceAtIso: string,
  changedThreadKeys: Set<string>
): Promise<string[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const sinceAt = new Date(sinceAtIso);
  const lowerBound = new Date(sinceAt.getTime() - 96 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("articles")
    .select(
      "id, title, published_at, article_intelligence(significance_score, story_type, story_thread_id)"
    )
    .lt("published_at", sinceAtIso)
    .gte("published_at", lowerBound)
    .order("published_at", { ascending: false })
    .limit(80);

  if (error) {
    if (!error.message.includes("relationship")) {
      console.error("[Continuity] Failed to fetch unchanged context:", error.message);
    }
    return [];
  }

  const titles: string[] = [];
  const seen = new Set<string>();

  for (const row of data || []) {
    const intelligence = firstOrNull(
      row.article_intelligence as DbIntelligenceRow | DbIntelligenceRow[] | null
    );

    const significance = intelligence?.significance_score || 0;
    const storyType = intelligence?.story_type || "";
    const threadKey =
      intelligence?.story_thread_id || normalizeTitleForThread((row.title as string) || "");

    if (significance < 7) continue;
    if (!["developing", "breaking", "analysis", "update"].includes(storyType)) continue;
    if (changedThreadKeys.has(threadKey)) continue;

    const title = (row.title as string) || "";
    const titleKey = title.toLowerCase();
    if (!title || seen.has(titleKey)) continue;

    seen.add(titleKey);
    titles.push(title);
    if (titles.length >= 5) break;
  }

  return titles;
}

function rankCandidates(
  candidates: RawCandidate[],
  watchlistTerms: string[],
  topicEngagementScores: Record<string, number>
): RankedCandidate[] {
  const maxTopicEngagement = Math.max(...Object.values(topicEngagementScores), 1);

  return candidates
    .map((candidate) => {
      const watchlistMatches = getWatchlistMatches(candidate.searchText, watchlistTerms);
      const watchlistBoost = Math.min(watchlistMatches.length * 2.25, 7);

      const topicScore = topicEngagementScores[candidate.topic] || 0;
      const topicBoost = (topicScore / maxTopicEngagement) * 2.5;

      const significanceBoost = (candidate.significanceScore / 10) * 6;
      const recencyBoost = computeRecencyScore(candidate.publishedAt);
      const summaryBoost = candidate.summaryText.length > 0 ? 0.6 : 0;

      const reactionBoost = candidate.reactions.reduce(
        (sum, reaction) => sum + (REACTION_WEIGHTS[reaction] || 0),
        0
      );

      const score =
        significanceBoost +
        recencyBoost +
        watchlistBoost +
        topicBoost +
        summaryBoost +
        reactionBoost;

      const reason = pickReason(candidate, watchlistMatches, topicBoost, reactionBoost);

      return {
        ...candidate,
        watchlistMatches,
        reason,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function toHighlights(
  ranked: RankedCandidate[],
  limit: number
): SinceLastReadHighlight[] {
  return ranked.slice(0, limit).map((candidate) => ({
    articleId: candidate.articleId,
    title: candidate.title,
    source: candidate.source,
    sourceUrl: candidate.sourceUrl,
    topic: candidate.topic,
    publishedAt: candidate.publishedAt,
    significanceScore: candidate.significanceScore,
    watchlistMatches: candidate.watchlistMatches,
    reason: candidate.reason,
    watchForNext: candidate.watchForNext,
  }));
}

async function maybeLoadCachedSnapshot(
  clientId: string,
  snapshotHash: string,
  depth: ContinuityDepth
): Promise<SinceLastReadPayload | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const cutoffIso = new Date(Date.now() - SNAPSHOT_TTL_MS).toISOString();

  const { data, error } = await supabase
    .from("continuity_snapshots")
    .select("payload, generated_at")
    .eq("client_id", clientId)
    .eq("snapshot_hash", snapshotHash)
    .eq("depth", depth)
    .gte("generated_at", cutoffIso)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (!error.message.includes("relation")) {
      console.error("[Continuity] Cache read error:", error.message);
    }
    return null;
  }

  if (!data?.payload || typeof data.payload !== "object") return null;

  return data.payload as SinceLastReadPayload;
}

async function maybeStoreSnapshot(args: {
  clientId: string;
  snapshotHash: string;
  depth: ContinuityDepth;
  sinceAtIso: string;
  untilAtIso: string;
  payload: SinceLastReadPayload;
  modelUsed: string | null;
  inputTokens: number;
  outputTokens: number;
}): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  const { error } = await supabase.from("continuity_snapshots").upsert(
    {
      client_id: args.clientId,
      snapshot_hash: args.snapshotHash,
      depth: args.depth,
      since_at: args.sinceAtIso,
      until_at: args.untilAtIso,
      payload: args.payload,
      model_used: args.modelUsed,
      input_tokens: args.inputTokens,
      output_tokens: args.outputTokens,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "client_id,snapshot_hash,depth" }
  );

  if (error && !error.message.includes("relation")) {
    console.error("[Continuity] Cache write error:", error.message);
  }
}

async function maybeCleanupOldSnapshots(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  if (Math.random() > 0.08) return;

  const cutoffIso = new Date(
    Date.now() - SNAPSHOT_RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  await supabase
    .from("continuity_snapshots")
    .delete()
    .lt("generated_at", cutoffIso);
}

async function persistStateTouch(args: {
  clientId: string;
  preferredDepth: ContinuityDepth;
  snapshotHash: string;
}): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  const { error } = await supabase.from("continuity_state").upsert(
    {
      client_id: args.clientId,
      preferred_depth: args.preferredDepth,
      last_snapshot_hash: args.snapshotHash,
      last_snapshot_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id" }
  );

  if (error && !error.message.includes("relation")) {
    console.error("[Continuity] Failed to update continuity_state:", error.message);
  }
}

function buildCitationToken(index: number): string {
  return `[A${index + 1}]`;
}

async function generateBriefWithClaude(args: {
  depth: ContinuityDepth;
  highlights: SinceLastReadHighlight[];
  unchangedTitles: string[];
  fallback: SinceLastReadBrief;
  lastSeenAt: string | null;
}): Promise<{ brief: SinceLastReadBrief; modelUsed: string | null; inputTokens: number; outputTokens: number }> {
  const { depth, highlights, unchangedTitles, fallback, lastSeenAt } = args;

  if (!isClaudeConfigured()) {
    return { brief: fallback, modelUsed: null, inputTokens: 0, outputTokens: 0 };
  }

  const budget = await checkBudget();
  if (!budget.allowed) {
    return { brief: fallback, modelUsed: null, inputTokens: 0, outputTokens: 0 };
  }

  const anthropic = getAnthropicClient();
  if (!anthropic) {
    return { brief: fallback, modelUsed: null, inputTokens: 0, outputTokens: 0 };
  }

  const cfg = DEPTH_CONFIG[depth];
  const model = depth === "2m" ? "claude-3-5-haiku-20241022" : "claude-sonnet-4-20250514";

  const contextRows = highlights.slice(0, cfg.maxSourceArticles).map((item, index) => {
    const watchNext = item.watchForNext ? `\nWatch next: ${item.watchForNext}` : "";
    const watchlist =
      item.watchlistMatches.length > 0
        ? `\nWatchlist hits: ${item.watchlistMatches.join(", ")}`
        : "";

    return `${buildCitationToken(index)}\nTitle: ${item.title}\nSource: ${item.source}\nPublished: ${item.publishedAt}\nTopic: ${item.topic}\nReason: ${item.reason}${watchlist}${watchNext}`;
  });

  const unchangedContext = unchangedTitles.length
    ? unchangedTitles.map((title, index) => `${index + 1}. ${title}`).join("\n")
    : "None";

  const lastSeenInstruction = lastSeenAt
    ? `The reader last opened the app at: ${lastSeenAt}.`
    : "This looks like the reader's first visit, so summarize the last 24 hours.";

  const prompt = `You are generating a "Since You Last Read" catch-up for a returning user.
${lastSeenInstruction}

Use only the provided source set. Do not invent facts.

Source updates:
${contextRows.join("\n\n")}

Potential ongoing threads without fresh updates:
${unchangedContext}

Return EXACTLY valid JSON (no markdown, no code fences):
{
  "headline": "One sentence. Mention what changed since last read.",
  "summary": "Two concise sentences with concrete context.",
  "changed": ["3-7 bullets. Every bullet must include at least one citation token like [A1]."],
  "unchanged": ["0-3 bullets describing still-open threads."],
  "watchNext": ["2-5 bullets with specific follow-ups and at least one citation token when supported."]
}

Keep bullets short and scannable. Preserve citation tokens exactly as [A#].`;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: cfg.maxTokens,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = parseJsonObject(text);
    const brief = validateBriefShape(parsed, fallback);

    await recordUsage(response.usage.input_tokens, response.usage.output_tokens);

    return {
      brief,
      modelUsed: model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch (error) {
    console.error("[Continuity] Claude generation failed:", error);
    return { brief: fallback, modelUsed: null, inputTokens: 0, outputTokens: 0 };
  }
}

function buildBasePayload(args: {
  clientId: string;
  depth: ContinuityDepth;
  lastSeenAt: string | null;
  sinceAtIso: string;
  untilAtIso: string;
  snapshotHash: string;
  highlights: SinceLastReadHighlight[];
  rankedCandidates: RankedCandidate[];
  brief: SinceLastReadBrief;
}): SinceLastReadPayload {
  const { highlights, rankedCandidates } = args;

  const newThreadCount = new Set(rankedCandidates.map((candidate) => candidate.threadKey)).size;
  const watchlistHits = rankedCandidates.filter(
    (candidate) => candidate.watchlistMatches.length > 0
  ).length;

  return {
    state: {
      clientId: args.clientId,
      depth: args.depth,
      lastSeenAt: args.lastSeenAt,
      sinceAt: args.sinceAtIso,
      untilAt: args.untilAtIso,
      isFirstVisit: !args.lastSeenAt,
      cached: false,
      snapshotHash: args.snapshotHash,
    },
    counts: {
      newArticles: rankedCandidates.length,
      newThreads: newThreadCount,
      watchlistHits,
    },
    highlights,
    brief: args.brief,
    citations: highlights.map((item) => ({
      articleId: item.articleId,
      title: item.title,
      source: item.source,
      sourceUrl: item.sourceUrl,
      publishedAt: item.publishedAt,
    })),
  };
}

export async function getSinceLastRead(options: {
  clientId: string;
  depth?: string | null;
}): Promise<SinceLastReadPayload> {
  const clientId = normalizeClientId(options.clientId);
  const continuityState = await fetchOrCreateContinuityState(clientId);
  const requestedDepth =
    options.depth == null ? null : normalizeDepth(options.depth);
  const depth = requestedDepth || continuityState.preferred_depth || DEFAULT_DEPTH;

  const now = new Date();
  const rawSince = parseIsoDate(continuityState.last_seen_at);
  const sinceAt = rawSince || new Date(now.getTime() - DEFAULT_LOOKBACK_HOURS * 60 * 60 * 1000);
  const sinceAtIso = sinceAt.toISOString();
  const untilAtIso = now.toISOString();

  const [watchlistTerms, topicEngagementScores, deltaArticles] = await Promise.all([
    loadWatchlistTerms(),
    loadTopicEngagementScores(),
    fetchDeltaArticles(sinceAtIso),
  ]);

  const rankedCandidates = rankCandidates(
    deltaArticles,
    watchlistTerms,
    topicEngagementScores
  );

  const cfg = DEPTH_CONFIG[depth];
  const highlights = toHighlights(rankedCandidates, cfg.highlightLimit);
  const snapshotHash = makeSnapshotHash(
    clientId,
    depth,
    sinceAtIso,
    rankedCandidates.map((candidate) => candidate.articleId)
  );

  const cached = await maybeLoadCachedSnapshot(clientId, snapshotHash, depth);
  if (cached) {
    const safeHighlights = Array.isArray(cached.highlights)
      ? cached.highlights.slice(0, cfg.highlightLimit)
      : [];
    const citations = Array.isArray(cached.citations)
      ? cached.citations.slice(0, cfg.citationLimit)
      : [];
    const safeBrief =
      cached.brief && typeof cached.brief === "object"
        ? (cached.brief as SinceLastReadBrief)
        : buildFallbackBrief(
            safeHighlights,
            [],
            depth,
            safeHighlights.length,
            continuityState.last_seen_at
          );

    const hydrated: SinceLastReadPayload = {
      ...cached,
      highlights: safeHighlights,
      brief: safeBrief,
      state: {
        ...cached.state,
        clientId,
        depth,
        lastSeenAt: continuityState.last_seen_at,
        sinceAt: sinceAtIso,
        untilAt: untilAtIso,
        cached: true,
        snapshotHash,
      },
      citations,
    };

    await persistStateTouch({
      clientId,
      preferredDepth: depth,
      snapshotHash,
    });

    return hydrated;
  }

  const changedThreadKeys = new Set(rankedCandidates.map((candidate) => candidate.threadKey));
  const unchangedTitles = await fetchUnchangedContext(sinceAtIso, changedThreadKeys);

  const fallbackBrief = buildFallbackBrief(
    highlights,
    unchangedTitles,
    depth,
    rankedCandidates.length,
    continuityState.last_seen_at
  );

  const generated = await generateBriefWithClaude({
    depth,
    highlights,
    unchangedTitles,
    fallback: fallbackBrief,
    lastSeenAt: continuityState.last_seen_at,
  });

  const payload = buildBasePayload({
    clientId,
    depth,
    lastSeenAt: continuityState.last_seen_at,
    sinceAtIso,
    untilAtIso,
    snapshotHash,
    highlights,
    rankedCandidates,
    brief: generated.brief,
  });

  payload.citations = payload.citations.slice(0, cfg.citationLimit);

  await Promise.all([
    maybeStoreSnapshot({
      clientId,
      snapshotHash,
      depth,
      sinceAtIso,
      untilAtIso,
      payload,
      modelUsed: generated.modelUsed,
      inputTokens: generated.inputTokens,
      outputTokens: generated.outputTokens,
    }),
    persistStateTouch({
      clientId,
      preferredDepth: depth,
      snapshotHash,
    }),
    maybeCleanupOldSnapshots(),
  ]);

  return payload;
}

export async function acknowledgeSinceLastRead(options: {
  clientId: string;
  depth?: string | null;
  untilAt?: string | null;
}): Promise<{ clientId: string; lastSeenAt: string; preferredDepth: ContinuityDepth }> {
  const clientId = normalizeClientId(options.clientId);
  const preferredDepth = normalizeDepth(options.depth);

  const parsedUntil = parseIsoDate(options.untilAt || null);
  const now = new Date();

  let nextSeenAt = parsedUntil || now;
  if (nextSeenAt.getTime() > now.getTime() + 60_000) {
    nextSeenAt = now;
  }

  const lastSeenAt = nextSeenAt.toISOString();

  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from("continuity_state").upsert(
      {
        client_id: clientId,
        last_seen_at: lastSeenAt,
        preferred_depth: preferredDepth,
        updated_at: now.toISOString(),
      },
      { onConflict: "client_id" }
    );

    if (error && !error.message.includes("relation")) {
      console.error("[Continuity] Failed to acknowledge:", error.message);
    }
  }

  return {
    clientId,
    lastSeenAt,
    preferredDepth,
  };
}
