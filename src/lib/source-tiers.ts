/**
 * Source Tiering System
 *
 * Three-tier system for prioritizing content based on source quality:
 *   Tier 1 — Edge Sources: Break news first, deep beat expertise, original analysis
 *   Tier 2 — Quality Sources: Strong journalism, usually reporting on what Tier 1 broke
 *   Tier 3 — Mainstream Sources: Aggregation, reaction coverage, often behind
 *
 * Lookup order: exact name → fuzzy name (substring) → domain match → default (tier 3)
 */

import { supabaseAdmin as supabase, isSupabaseAdminConfigured as isSupabaseConfigured } from "./supabase";

export type SourceTier = 1 | 2 | 3;

// ─── Tier 1: Edge Sources ──────────────────────────────────────
// Break news first, deep beat expertise, original analysis
const TIER_1_NAMES: string[] = [
  "Eric Newcomer",
  "Newcomer",
  "The Information",
  "Stratechery",
  "Ben Thompson",
  "Matt Levine",
  "Money Stuff",
  "Matt Levine's Money Stuff",
  "Byrne Hobart",
  "The Diff",
  "Packy McCormick",
  "Not Boring",
  "Puck News",
  "Puck",
  "Semafor",
  "Semafor Energy",
  "Semafor Gulf",
  "Semafor Business",
  "Semafor Tech",
  "Bill Bishop",
  "Sinocism",
  "Marc Rubinstein",
  "Net Interest",
  "Ben Hunt",
  "Epsilon Theory",
  "Odd Lots",
  "SEC EDGAR 8-K",
  "SEC EDGAR S-1",
  "SEC EDGAR 10-K",
  "Federal Reserve Monetary Policy",
  "Federal Reserve Press Releases",
  // Bloomberg (moved from Tier 2)
  "Bloomberg",
  "Bloomberg News",
  "Bloomberg Opinion",
  "Bloomberg Markets",
  "Bloomberg Technology",
  "Bloomberg Businessweek",
  "Bloomberg Evening Briefing",
  "Bloomberg Morning Briefing",
  "Bloomberg Green",
  // Benedict Evans (moved from Tier 3 default)
  "Benedict Evans",
  "Benedict's Newsletter",
];

const TIER_1_DOMAINS: string[] = [
  "newcomer.co",
  "theinformation.com",
  "stratechery.com",
  "puck.news",
  "pucknews.com",
  "semafor.com",
  "sinocism.com",
  "netinterest.co",
  "epsilontheory.com",
  "thediff.co",
  "notboring.co",
  "sec.gov",
  "federalreserve.gov",
  "bloomberg.com",
  "ben-evans.com",
];

// ─── Tier 2: Quality Sources ───────────────────────────────────
// Strong journalism, usually reporting on what Tier 1 broke
const TIER_2_NAMES: string[] = [
  "Financial Times",
  "FT",
  "FT One Must-Read",
  "FT Due Diligence",
  "FT Alphaville",
  "Wall Street Journal",
  "The Wall Street Journal",
  "WSJ",
  "WSJ Morning Briefing",
  "WSJ Evening Briefing",
  "Reuters",
  "Reuters Business",
  "Reuters World",
  "The Economist",
  "Axios",
  "Politico",
  "Foreign Policy",
  "MIT Tech Review",
  "MIT Technology Review",
  "StrictlyVC",
  "CB Insights",
  // Lenny's Newsletter (moved from Tier 3 default)
  "Lenny's Newsletter",
  "Lenny Rachitsky",
];

const TIER_2_DOMAINS: string[] = [
  "ft.com",
  "wsj.com",
  "reuters.com",
  "reutersagency.com",
  "economist.com",
  "axios.com",
  "politico.com",
  "foreignpolicy.com",
  "technologyreview.com",
  "strictlyvc.com",
  "cbinsights.com",
  "lennysnewsletter.com",
];

// ─── Tier 3: Mainstream Sources ────────────────────────────────
// Aggregation, reaction coverage, often behind
// (These are explicitly listed so they show up as tier 3 instead of "unknown default")
const TIER_3_NAMES: string[] = [
  "TechCrunch",
  "The Verge",
  "CNBC",
  "VentureBeat",
  "Wired",
  "Fortune",
  "Business Insider",
  "MarketWatch",
  "Ars Technica",
  "Electrek",
  "Crunchbase News",
  "AP World News",
  "AP Politics",
  "Morning Brew",
  "The Hustle",
  "Finimize",
  "Car and Driver",
  "Jalopnik",
  "Road & Track",
  "The Drive",
  "NBC News",
];

const TIER_3_DOMAINS: string[] = [
  "techcrunch.com",
  "theverge.com",
  "cnbc.com",
  "venturebeat.com",
  "wired.com",
  "fortune.com",
  "businessinsider.com",
  "marketwatch.com",
  "arstechnica.com",
  "electrek.co",
  "crunchbase.com",
  "apnews.com",
  "morningbrew.com",
  "thehustle.co",
  "finimize.com",
  "caranddriver.com",
  "jalopnik.com",
  "roadandtrack.com",
  "thedrive.com",
  "nbcnews.com",
];

// ─── Lookup Maps (built once at module load) ───────────────────

const nameToTier = new Map<string, SourceTier>();
const domainToTier = new Map<string, SourceTier>();

function registerTier(
  names: string[],
  domains: string[],
  tier: SourceTier
) {
  for (const name of names) {
    nameToTier.set(name.toLowerCase(), tier);
  }
  for (const domain of domains) {
    domainToTier.set(domain.toLowerCase(), tier);
  }
}

registerTier(TIER_1_NAMES, TIER_1_DOMAINS, 1);
registerTier(TIER_2_NAMES, TIER_2_DOMAINS, 2);
registerTier(TIER_3_NAMES, TIER_3_DOMAINS, 3);

// ─── Public API ────────────────────────────────────────────────

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Get the tier for a source by name.
 * Case-insensitive. Uses a two-pass strategy:
 *   1. Exact match (fast path)
 *   2. Fuzzy match: check if any registered name is a substring of the input,
 *      or the input is a substring of a registered name.
 *      For short names (< 3 chars like "FT"), requires a word boundary.
 *      If multiple names match, the best (lowest) tier wins.
 */
export function getTierByName(name: string): SourceTier | undefined {
  const lower = name.toLowerCase().trim();

  // Empty string matches everything in fuzzy mode — bail out
  if (!lower) return undefined;

  // 1. Exact match
  const exact = nameToTier.get(lower);
  if (exact !== undefined) return exact;

  // 2. Fuzzy substring match
  let bestTier: SourceTier | undefined;
  for (const [registered, tier] of nameToTier) {
    let matched = false;

    if (registered.length < 3) {
      // Short names: require word boundary to avoid false positives
      // "FT" should match "FT One Must-Read" but NOT "software"
      const pattern = new RegExp(
        `(?:^|[\\s\\-–—:,;(])${escapeRegex(registered)}(?:[\\s\\-–—:,;)]|$)`
      );
      matched = pattern.test(lower);
    } else {
      // Longer names: substring match in either direction
      matched = lower.includes(registered) || registered.includes(lower);
    }

    if (matched && (bestTier === undefined || tier < bestTier)) {
      bestTier = tier;
    }
  }

  return bestTier;
}

/**
 * Get the tier for a source by domain.
 * Handles subdomains (e.g. "feeds.bloomberg.com" → "bloomberg.com").
 * Returns undefined if not found by domain.
 */
export function getTierByDomain(domain: string): SourceTier | undefined {
  const lower = domain.toLowerCase();
  // Try exact match first
  if (domainToTier.has(lower)) return domainToTier.get(lower);
  // Try stripping subdomains progressively
  const parts = lower.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join(".");
    if (domainToTier.has(parent)) return domainToTier.get(parent);
  }
  return undefined;
}

/**
 * Extract domain from a URL string.
 */
function extractDomainFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Extract domain from an email address.
 */
function extractDomainFromEmail(email: string): string | null {
  const parts = email.split("@");
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}

/**
 * Get the source tier for an article.
 * Tries: source name → URL domain → default (3).
 */
export function getArticleSourceTier(
  sourceName: string,
  url?: string
): SourceTier {
  // 1. Try by name
  const byName = getTierByName(sourceName);
  if (byName !== undefined) return byName;

  // 2. Try by URL domain
  if (url) {
    const domain = extractDomainFromUrl(url);
    if (domain) {
      const byDomain = getTierByDomain(domain);
      if (byDomain !== undefined) return byDomain;
    }
  }

  // 3. Default to tier 3
  return 3;
}

/**
 * Get the source tier for a newsletter.
 * Tries: publication name → sender email domain → default (3).
 */
export function getNewsletterSourceTier(
  publication: string,
  senderEmail?: string
): SourceTier {
  // 1. Try by publication name
  const byName = getTierByName(publication);
  if (byName !== undefined) return byName;

  // 2. Try by sender email domain
  if (senderEmail) {
    const domain = extractDomainFromEmail(senderEmail);
    if (domain) {
      const byDomain = getTierByDomain(domain);
      if (byDomain !== undefined) return byDomain;
    }
  }

  // 3. Default to tier 3
  return 3;
}

/**
 * Convert a source tier (1=best) to a quality weight (3=best).
 * Used for backwards compatibility with existing claude.ts logic.
 */
export function tierToWeight(tier: SourceTier): number {
  return 4 - tier; // tier 1 → weight 3, tier 2 → weight 2, tier 3 → weight 1
}

/**
 * Get the human-readable label for a tier.
 */
export function getTierLabel(tier: SourceTier): string {
  switch (tier) {
    case 1:
      return "Edge";
    case 2:
      return "Quality";
    case 3:
      return "Mainstream";
  }
}

/**
 * Get all registered source names for a given tier.
 * Useful for admin display / debugging.
 */
export function getSourcesForTier(tier: SourceTier): string[] {
  const results: string[] = [];
  for (const [name, t] of nameToTier) {
    if (t === tier) results.push(name);
  }
  return results;
}

// ─── Re-tiering Existing Content ──────────────────────────────

export interface RetierStats {
  articlesChecked: number;
  articlesUpdated: number;
  articlesByTier: Record<number, number>;
  newslettersChecked: number;
  newslettersUpdated: number;
  newslettersByTier: Record<number, number>;
}

/**
 * Re-compute and update source_tier for all existing articles and newsletters.
 * Articles: uses URL domain matching (source name isn't stored in DB).
 * Newsletters: uses publication name (fuzzy) + sender email domain.
 */
export async function retierAllContent(): Promise<RetierStats> {
  const stats: RetierStats = {
    articlesChecked: 0,
    articlesUpdated: 0,
    articlesByTier: { 1: 0, 2: 0, 3: 0 },
    newslettersChecked: 0,
    newslettersUpdated: 0,
    newslettersByTier: { 1: 0, 2: 0, 3: 0 },
  };

  if (!isSupabaseConfigured() || !supabase) return stats;

  // ── Re-tier articles ──────────────────────────────────
  const { data: articles } = await supabase
    .from("articles")
    .select("id, url, source_tier");

  if (articles) {
    stats.articlesChecked = articles.length;

    // Group article IDs by their correct tier
    const updateBuckets: Record<number, string[]> = { 1: [], 2: [], 3: [] };

    for (const article of articles) {
      const correctTier = article.url
        ? getArticleSourceTier("", article.url)
        : 3;
      stats.articlesByTier[correctTier]++;
      if (correctTier !== article.source_tier) {
        updateBuckets[correctTier].push(article.id);
      }
    }

    // Batch update by tier (max 3 queries)
    for (const [tier, ids] of Object.entries(updateBuckets)) {
      if (ids.length > 0) {
        // Supabase .in() has a limit, batch in chunks of 500
        for (let i = 0; i < ids.length; i += 500) {
          const chunk = ids.slice(i, i + 500);
          await supabase
            .from("articles")
            .update({ source_tier: Number(tier) })
            .in("id", chunk);
        }
        stats.articlesUpdated += ids.length;
      }
    }
  }

  // ── Re-tier newsletters ───────────────────────────────
  const { data: newsletters } = await supabase
    .from("newsletters")
    .select("id, publication, sender_email, source_tier");

  if (newsletters) {
    stats.newslettersChecked = newsletters.length;

    const updateBuckets: Record<number, string[]> = { 1: [], 2: [], 3: [] };

    for (const nl of newsletters) {
      const correctTier = getNewsletterSourceTier(
        nl.publication,
        nl.sender_email
      );
      stats.newslettersByTier[correctTier]++;
      if (correctTier !== nl.source_tier) {
        updateBuckets[correctTier].push(nl.id);
      }
    }

    for (const [tier, ids] of Object.entries(updateBuckets)) {
      if (ids.length > 0) {
        for (let i = 0; i < ids.length; i += 500) {
          const chunk = ids.slice(i, i + 500);
          await supabase
            .from("newsletters")
            .update({ source_tier: Number(tier) })
            .in("id", chunk);
        }
        stats.newslettersUpdated += ids.length;
      }
    }
  }

  console.log(
    `[Retier] Articles: ${stats.articlesUpdated}/${stats.articlesChecked} updated ` +
    `(T1:${stats.articlesByTier[1]} T2:${stats.articlesByTier[2]} T3:${stats.articlesByTier[3]}). ` +
    `Newsletters: ${stats.newslettersUpdated}/${stats.newslettersChecked} updated ` +
    `(T1:${stats.newslettersByTier[1]} T2:${stats.newslettersByTier[2]} T3:${stats.newslettersByTier[3]})`
  );

  return stats;
}
