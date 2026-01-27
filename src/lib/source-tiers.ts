/**
 * Source Tiering System
 *
 * Three-tier system for prioritizing content based on source quality:
 *   Tier 1 — Edge Sources: Break news first, deep beat expertise, original analysis
 *   Tier 2 — Quality Sources: Strong journalism, usually reporting on what Tier 1 broke
 *   Tier 3 — Mainstream Sources: Aggregation, reaction coverage, often behind
 *
 * Lookup order: name match (case-insensitive) → domain match → default (tier 3)
 */

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
  "Byrne Hobart",
  "The Diff",
  "Packy McCormick",
  "Not Boring",
  "Puck News",
  "Puck",
  "Semafor",
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
];

// ─── Tier 2: Quality Sources ───────────────────────────────────
// Strong journalism, usually reporting on what Tier 1 broke
const TIER_2_NAMES: string[] = [
  "Bloomberg",
  "Financial Times",
  "FT",
  "Wall Street Journal",
  "WSJ",
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
];

const TIER_2_DOMAINS: string[] = [
  "bloomberg.com",
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
 * Get the tier for a source by name.
 * Case-insensitive. Returns undefined if not found by name.
 */
export function getTierByName(name: string): SourceTier | undefined {
  return nameToTier.get(name.toLowerCase());
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
