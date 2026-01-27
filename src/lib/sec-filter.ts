/**
 * SEC Filing Relevance Filter
 *
 * Filters SEC EDGAR filings to only include companies that are relevant:
 *   1. Companies on the user's watchlist (Supabase)
 *   2. Companies mentioned in recent articles (key_entities, last 7 days)
 *   3. Hardcoded major companies list (~80 names)
 *
 * Non-SEC articles pass through unchanged.
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import type { RawArticle } from "./rss-fetcher";

// ─── Major Companies List (~80) ─────────────────────────────
// FAANG, top banks, major startups, significant public companies
export const MAJOR_COMPANIES: string[] = [
  // Big Tech
  "Apple", "Microsoft", "Google", "Alphabet", "Amazon", "Meta",
  "Nvidia", "Tesla", "Netflix", "Salesforce", "Adobe", "Oracle",
  "Intel", "AMD", "Qualcomm", "Broadcom", "IBM", "Cisco",
  "Uber", "Airbnb", "Snowflake", "Palantir", "Databricks",
  "CrowdStrike", "Palo Alto Networks",

  // AI Companies
  "OpenAI", "Anthropic", "Mistral", "Cohere", "Stability AI",
  "Inflection AI", "xAI",

  // Major Startups / Private
  "SpaceX", "Stripe", "Instacart", "Discord", "Figma",
  "Canva", "Plaid", "Rippling", "Anduril", "Scale AI",
  "Databricks", "Klarna",

  // Banks & Finance
  "JPMorgan", "JP Morgan", "Goldman Sachs", "Morgan Stanley",
  "Bank of America", "Citigroup", "Citi", "Wells Fargo",
  "BlackRock", "Vanguard", "Charles Schwab", "Fidelity",
  "Berkshire Hathaway",

  // VC Firms (when filing)
  "Andreessen Horowitz", "a16z", "Sequoia Capital", "Sequoia",
  "Lightspeed", "Accel", "Benchmark", "Kleiner Perkins",
  "Tiger Global", "SoftBank",

  // Automotive
  "Rivian", "Lucid", "Waymo", "Cruise",

  // Pharma / Health
  "Pfizer", "Moderna", "Johnson & Johnson", "UnitedHealth",

  // Other Major
  "Walmart", "Disney", "Boeing", "Lockheed Martin",
  "Exxon", "ExxonMobil", "Chevron", "Shell",
  "Coinbase", "Robinhood", "Block", "Square", "PayPal",
  "Visa", "Mastercard",
];

// Pre-compute lowercase set for fast lookups
const majorCompaniesLower = new Set(MAJOR_COMPANIES.map((c) => c.toLowerCase()));

/**
 * Load watchlist company names from Supabase.
 */
async function getWatchlistCompanies(): Promise<Set<string>> {
  const companies = new Set<string>();
  if (!isSupabaseConfigured() || !supabase) return companies;

  try {
    const { data } = await supabase
      .from("watchlist")
      .select("name")
      .eq("type", "company");

    if (data) {
      for (const item of data) {
        companies.add((item.name as string).toLowerCase());
      }
    }
  } catch (error) {
    console.error("[SEC Filter] Failed to load watchlist:", error);
  }

  return companies;
}

/**
 * Load company names mentioned in recent articles (last 7 days).
 * Scans key_entities from the summaries table.
 */
async function getRecentArticleCompanies(): Promise<Set<string>> {
  const companies = new Set<string>();
  if (!isSupabaseConfigured() || !supabase) return companies;

  try {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const { data } = await supabase
      .from("summaries")
      .select("key_entities, generated_at")
      .gte("generated_at", since.toISOString())
      .not("key_entities", "is", null);

    if (data) {
      for (const row of data) {
        const entities = row.key_entities as Array<{ name: string; type: string }>;
        if (Array.isArray(entities)) {
          for (const entity of entities) {
            if (entity.type === "company") {
              companies.add(entity.name.toLowerCase());
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("[SEC Filter] Failed to load recent companies:", error);
  }

  return companies;
}

/**
 * Get all relevant company names from the 3 sources:
 * 1. Watchlist (Supabase)
 * 2. Recent article entities (7-day)
 * 3. Major companies list (hardcoded)
 */
export async function getRelevantCompanies(): Promise<Set<string>> {
  const [watchlist, recentCompanies] = await Promise.all([
    getWatchlistCompanies(),
    getRecentArticleCompanies(),
  ]);

  // Combine all sources into one set
  const relevant = new Set<string>([
    ...watchlist,
    ...recentCompanies,
    ...majorCompaniesLower,
  ]);

  return relevant;
}

/**
 * Extract company name from EDGAR title format.
 * EDGAR titles look like: "8-K - Apple Inc (0000320193) (Filer)"
 * Returns the company name portion, or null if parsing fails.
 */
export function extractCompanyFromEdgarTitle(title: string): string | null {
  // Pattern: "FORM_TYPE - COMPANY_NAME (CIK) (Filer)"
  const match = title.match(/^[\w-]+\s*-\s*(.+?)(?:\s*\(\d+\)|\s*\(Filer\))/i);
  if (match) {
    return match[1].trim().replace(/\s*\(Filer\)$/i, "").trim();
  }

  // Fallback: try to extract everything after the dash
  const dashMatch = title.match(/^[\w-]+\s*-\s*(.+)/);
  if (dashMatch) {
    return dashMatch[1].trim();
  }

  return null;
}

/**
 * Check if a filing is relevant based on company name.
 */
export function isRelevantFiling(
  title: string,
  companyName: string | null,
  relevantCompanies: Set<string>
): boolean {
  // Check the extracted company name
  if (companyName) {
    const lower = companyName.toLowerCase();
    // Exact match
    if (relevantCompanies.has(lower)) return true;
    // Partial match: check if any relevant company is contained in the name
    for (const relevant of relevantCompanies) {
      if (lower.includes(relevant) || relevant.includes(lower)) return true;
    }
  }

  // Check if the title contains any relevant company name
  const titleLower = title.toLowerCase();
  for (const company of relevantCompanies) {
    if (company.length >= 3 && titleLower.includes(company)) return true;
  }

  return false;
}

/**
 * Filter SEC filings to only relevant companies.
 * Non-SEC articles pass through unchanged.
 */
export async function filterSECFilings(
  articles: RawArticle[]
): Promise<RawArticle[]> {
  // Split into SEC and non-SEC
  const secArticles = articles.filter((a) => a.sourceId.startsWith("sec-edgar-"));
  const nonSecArticles = articles.filter((a) => !a.sourceId.startsWith("sec-edgar-"));

  if (secArticles.length === 0) {
    return articles;
  }

  // Load relevant companies
  const relevantCompanies = await getRelevantCompanies();

  // Filter SEC articles
  const filteredSec = secArticles.filter((article) => {
    const companyName = extractCompanyFromEdgarTitle(article.title);
    return isRelevantFiling(article.title, companyName, relevantCompanies);
  });

  console.log(
    `[SEC Filter] ${secArticles.length} SEC filings → ${filteredSec.length} relevant (${secArticles.length - filteredSec.length} discarded)`
  );

  return [...nonSecArticles, ...filteredSec];
}
