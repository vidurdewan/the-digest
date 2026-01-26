import Parser from "rss-parser";
import type { TopicCategory } from "@/types";
import type { NewsSource } from "./sources";
import { generateContentHash } from "./article-utils";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "TheDigest/1.0 (news aggregator)",
    Accept: "application/rss+xml, application/xml, text/xml",
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
}

/**
 * Fetch articles from an RSS feed source.
 */
export async function fetchRssFeed(source: NewsSource): Promise<RawArticle[]> {
  try {
    const feed = await parser.parseURL(source.url);
    const articles: RawArticle[] = [];

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
  // Try media:content
  const media = item["media:content"] as
    | { $?: { url?: string } }
    | undefined;
  if (media?.$?.url) return media.$.url;

  // Try enclosure
  const enclosure = item.enclosure as
    | { url?: string; type?: string }
    | undefined;
  if (enclosure?.url && enclosure.type?.startsWith("image")) {
    return enclosure.url;
  }

  // Try to find image in content
  const content = (item["content:encoded"] || item.content) as
    | string
    | undefined;
  if (content) {
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/);
    if (imgMatch) return imgMatch[1];
  }

  return null;
}
