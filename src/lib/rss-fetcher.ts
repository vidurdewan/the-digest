import Parser from "rss-parser";
import type { TopicCategory, SourceTier, DocumentType } from "@/types";
import type { NewsSource } from "./sources";
import { generateContentHash } from "./article-utils";
import { getArticleSourceTier } from "./source-tiers";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "TheDigest/1.0 (news aggregator)",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
});

// SEC EDGAR requires a specific User-Agent for fair access policy
const secParser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "TheDigest support@thedigest.app",
    Accept: "application/atom+xml, application/xml, text/xml",
  },
});

export interface RawArticle {
  title: string;
  url: string;
  author: string | null;
  publishedAt: string;
  topic: TopicCategory;
  sourceName: string;
  sourceId: string;
  content: string | null;
  imageUrl: string | null;
  contentHash: string;
  sourceTier: SourceTier;
  documentType?: DocumentType;
  requiresClassification?: boolean;
}

/**
 * Detect the document type for a primary document source.
 */
function detectDocumentType(sourceId: string): DocumentType | undefined {
  if (sourceId === "sec-edgar-8k") return "8-K";
  if (sourceId === "sec-edgar-s1") return "S-1";
  if (sourceId === "sec-edgar-10k") return "10-K";
  if (sourceId.startsWith("fed-")) return "fed-release";
  return undefined;
}

/**
 * Fetch articles from an RSS feed source.
 */
export async function fetchRssFeed(source: NewsSource): Promise<RawArticle[]> {
  try {
    // Use SEC-compliant parser for EDGAR feeds
    const isSecSource = source.id.startsWith("sec-edgar-");
    const feedParser = isSecSource ? secParser : parser;
    const feed = await feedParser.parseURL(source.url);
    const articles: RawArticle[] = [];

    const documentType = detectDocumentType(source.id);

    for (const item of feed.items || []) {
      if (!item.title || !item.link) continue;

      const title = cleanText(item.title);
      const url = item.link;
      const publishedAt = item.pubDate
        ? new Date(item.pubDate).toISOString()
        : new Date().toISOString();

      // Extract content snippet from various RSS fields
      const content =
        cleanHtml(item["content:encoded"]) ||
        cleanHtml(item.content) ||
        cleanText(item.contentSnippet || item.summary || "") ||
        null;

      // Extract image from media or enclosure
      const imageUrl = extractImageUrl(item) || null;

      articles.push({
        title,
        url,
        author: item.creator || item.author || null,
        publishedAt,
        topic: source.topic,
        sourceName: source.name,
        sourceId: source.id,
        content,
        imageUrl,
        contentHash: generateContentHash(title, url),
        sourceTier: getArticleSourceTier(source.name, url),
        documentType,
        requiresClassification: source.requiresClassification,
      });
    }

    return articles;
  } catch (error) {
    console.error(`Failed to fetch RSS feed ${source.name}:`, error);
    return [];
  }
}

/**
 * Fetch articles from multiple RSS sources in parallel.
 * Limits concurrency to avoid overwhelming feeds.
 */
export async function fetchAllRssFeeds(
  sources: NewsSource[]
): Promise<RawArticle[]> {
  const concurrency = 5;
  const allArticles: RawArticle[] = [];

  for (let i = 0; i < sources.length; i += concurrency) {
    const batch = sources.slice(i, i + concurrency);
    const results = await Promise.allSettled(batch.map(fetchRssFeed));

    for (const result of results) {
      if (result.status === "fulfilled") {
        allArticles.push(...result.value);
      }
    }
  }

  return allArticles;
}

// ─── Helpers ─────────────────────────────────────────────

function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanHtml(html: string | undefined): string | null {
  if (!html) return null;
  const text = cleanText(html);
  return text.length > 50 ? text : null;
}

function extractImageUrl(item: Record<string, unknown>): string | null {
  // Try media:content (most common in RSS)
  const media = item["media:content"] as
    | { $?: { url?: string } }
    | undefined;
  if (media?.$?.url) return media.$.url;

  // Try media:thumbnail
  const mediaThumbnail = item["media:thumbnail"] as
    | { $?: { url?: string } }
    | undefined;
  if (mediaThumbnail?.$?.url) return mediaThumbnail.$.url;

  // Try media:group > media:content (used by some feeds)
  const mediaGroup = item["media:group"] as
    | { "media:content"?: { $?: { url?: string } } }
    | undefined;
  if (mediaGroup?.["media:content"]?.$?.url) return mediaGroup["media:content"].$.url;

  // Try top-level image field (used by some Atom feeds)
  const image = item.image as
    | { url?: string }
    | string
    | undefined;
  if (typeof image === "string" && image.startsWith("http")) return image;
  if (typeof image === "object" && image?.url) return image.url;

  // Try enclosure
  const enclosure = item.enclosure as
    | { url?: string; type?: string }
    | undefined;
  if (enclosure?.url && enclosure.type?.startsWith("image")) {
    return enclosure.url;
  }

  // Try itunes:image (some feeds use this)
  const itunesImage = item["itunes:image"] as
    | { $?: { href?: string } }
    | undefined;
  if (itunesImage?.$?.href) return itunesImage.$.href;

  // Try to find image in content HTML
  const content = (item["content:encoded"] || item.content) as
    | string
    | undefined;
  if (content) {
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/);
    if (imgMatch) return imgMatch[1];
  }

  return null;
}
