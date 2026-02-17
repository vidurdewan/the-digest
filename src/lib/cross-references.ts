/**
 * Cross-Reference System
 *
 * Connects articles ↔ newsletters ↔ primary sources via entity-based matching.
 * Operates entirely on client-side data — no API calls.
 */

import type { Article, Summary, Newsletter } from "@/types";

export interface RelatedItem {
  type: "article" | "newsletter" | "primary";
  id: string;
  source: string;
  title: string;
  sourceUrl?: string;
}

// ─── Fuzzy keyword synonyms ───────────────────────────────────
const KEYWORD_SYNONYMS: Record<string, string[]> = {
  ai: ["artificial intelligence", "machine learning", "ml", "deep learning", "llm", "generative ai"],
  "artificial intelligence": ["ai", "machine learning", "ml", "deep learning", "llm"],
  ev: ["electric vehicle", "electric vehicles", "battery"],
  "electric vehicle": ["ev", "electric vehicles", "battery"],
  ipo: ["initial public offering", "going public", "public offering"],
  "initial public offering": ["ipo", "going public"],
  crypto: ["cryptocurrency", "bitcoin", "blockchain", "web3"],
  cryptocurrency: ["crypto", "bitcoin", "blockchain"],
  fed: ["federal reserve", "interest rates", "monetary policy"],
  "federal reserve": ["fed", "interest rates", "monetary policy"],
  vc: ["venture capital", "startup funding", "series a", "series b"],
  "venture capital": ["vc", "startup funding"],
};

function normalizeEntity(name: string): string {
  return name.toLowerCase().trim();
}

function entitiesMatch(a: string, b: string): boolean {
  const na = normalizeEntity(a);
  const nb = normalizeEntity(b);

  // Exact match
  if (na === nb) return true;

  // Synonym match
  const synonymsA = KEYWORD_SYNONYMS[na];
  if (synonymsA && synonymsA.includes(nb)) return true;
  const synonymsB = KEYWORD_SYNONYMS[nb];
  if (synonymsB && synonymsB.includes(na)) return true;

  return false;
}

// ─── Entity extraction ────────────────────────────────────────

function extractArticleEntities(article: Article & { summary?: Summary }): string[] {
  const entities: string[] = [];
  if (article.summary?.keyEntities) {
    for (const e of article.summary.keyEntities) {
      entities.push(e.name);
    }
  }
  return entities;
}

function extractNewsletterEntities(newsletter: Newsletter): string[] {
  const entities: string[] = [];
  // Extract from newsletter summary text by checking for known entity mentions
  const ns = newsletter.newsletterSummary;
  if (ns) {
    // We don't have structured entities on newsletters, so return the text fields
    // for matching against. The caller will match entity names against this text.
    return [ns.theNews, ns.whyItMatters, ns.theContext].filter(Boolean);
  }
  if (newsletter.summary?.keyEntities) {
    for (const e of newsletter.summary.keyEntities) {
      entities.push(e.name);
    }
  }
  return entities;
}

function textContainsEntity(text: string, entityName: string): boolean {
  const lower = text.toLowerCase();
  const entity = entityName.toLowerCase();
  if (lower.includes(entity)) return true;

  // Check synonyms
  const synonyms = KEYWORD_SYNONYMS[entity];
  if (synonyms) {
    return synonyms.some((s) => lower.includes(s));
  }
  return false;
}

// ─── Main API ─────────────────────────────────────────────────

/**
 * Find content related to an article, matching via entity overlap.
 */
export function findRelatedForArticle(
  article: Article & { summary?: Summary },
  allArticles: (Article & { summary?: Summary })[],
  newsletters: Newsletter[],
): RelatedItem[] {
  const entities = extractArticleEntities(article);
  if (entities.length === 0) return [];

  const results: { item: RelatedItem; score: number }[] = [];

  // Match against other articles
  for (const other of allArticles) {
    if (other.id === article.id) continue;
    const otherEntities = extractArticleEntities(other);
    let score = 0;
    for (const e of entities) {
      for (const oe of otherEntities) {
        if (entitiesMatch(e, oe)) score++;
      }
    }
    if (score > 0) {
      results.push({
        item: {
          type: other.documentType ? "primary" : "article",
          id: other.id,
          source: other.source,
          title: other.title,
          sourceUrl: other.sourceUrl,
        },
        score,
      });
    }
  }

  // Match against newsletters (text-based)
  for (const nl of newsletters) {
    const nlTexts = extractNewsletterEntities(nl);
    let score = 0;
    for (const entityName of entities) {
      for (const text of nlTexts) {
        if (textContainsEntity(text, entityName)) {
          score++;
          break; // count each entity once per newsletter
        }
      }
    }
    if (score > 0) {
      results.push({
        item: {
          type: "newsletter",
          id: nl.id,
          source: nl.publication,
          title: nl.subject,
        },
        score,
      });
    }
  }

  // Sort by score descending, return top 4
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 4).map((r) => r.item);
}

/**
 * Find content related to a newsletter, matching via entity overlap with articles.
 */
export function findRelatedForNewsletter(
  newsletter: Newsletter,
  articles: (Article & { summary?: Summary })[],
  allNewsletters: Newsletter[],
): RelatedItem[] {
  // Get newsletter entities (text fields for matching)
  const nlSummary = newsletter.summary;

  // Collect entity names from newsletter.summary.keyEntities if available
  const entityNames: string[] = [];
  if (nlSummary?.keyEntities) {
    for (const e of nlSummary.keyEntities) {
      entityNames.push(e.name);
    }
  }

  // Also extract from subject line keywords
  const subjectWords = newsletter.subject
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const results: { item: RelatedItem; score: number }[] = [];

  // Match against articles
  for (const article of articles) {
    const articleEntities = extractArticleEntities(article);
    let score = 0;

    // Entity name matching
    for (const name of entityNames) {
      for (const ae of articleEntities) {
        if (entitiesMatch(name, ae)) score += 2;
      }
    }

    // Subject word matching against article entities (lighter weight)
    if (score === 0) {
      for (const word of subjectWords) {
        for (const ae of articleEntities) {
          if (ae.toLowerCase().includes(word)) score++;
        }
      }
    }

    if (score > 0) {
      results.push({
        item: {
          type: article.documentType ? "primary" : "article",
          id: article.id,
          source: article.source,
          title: article.title,
          sourceUrl: article.sourceUrl,
        },
        score,
      });
    }
  }

  // Match against other newsletters
  for (const other of allNewsletters) {
    if (other.id === newsletter.id) continue;
    let score = 0;
    const otherText = [
      other.newsletterSummary?.theNews,
      other.newsletterSummary?.whyItMatters,
    ].filter(Boolean).join(" ");

    for (const name of entityNames) {
      if (textContainsEntity(otherText, name)) score++;
    }
    if (score > 0) {
      results.push({
        item: {
          type: "newsletter",
          id: other.id,
          source: other.publication,
          title: other.subject,
        },
        score,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 4).map((r) => r.item);
}

/**
 * Find article IDs that share entities with a newsletter.
 * Used for hover highlight from newsletter rail → feed.
 */
export function findMatchingArticleIds(
  newsletter: Newsletter,
  articles: (Article & { summary?: Summary })[],
): string[] {
  const nlSummary = newsletter.summary;
  const entityNames: string[] = [];

  if (nlSummary?.keyEntities) {
    for (const e of nlSummary.keyEntities) {
      entityNames.push(e.name);
    }
  }

  if (entityNames.length === 0) {
    // Fall back to subject words
    const words = newsletter.subject
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 4);
    entityNames.push(...words.slice(0, 5));
  }

  const ids: string[] = [];
  for (const article of articles) {
    const ae = extractArticleEntities(article);
    for (const name of entityNames) {
      if (ae.some((e) => entitiesMatch(name, e))) {
        ids.push(article.id);
        break;
      }
    }
  }
  return ids;
}
