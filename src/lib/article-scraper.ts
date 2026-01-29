import * as cheerio from "cheerio";
import { convert } from "html-to-text";

/**
 * Lightweight image-only scraper — fetches just the og:image/twitter:image
 * from a URL without parsing the full article content.
 */
export async function scrapeImageUrl(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TheDigest/1.0; +https://thedigest.app)",
        Accept: "text/html",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("html")) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    const ogImage = $('meta[property="og:image"]').attr("content");
    if (ogImage) return ogImage;

    const twitterImage = $('meta[name="twitter:image"]').attr("content");
    if (twitterImage) return twitterImage;

    const firstImg = $("article img, main img, .article img")
      .first()
      .attr("src");
    if (firstImg) return firstImg;

    return null;
  } catch {
    return null;
  }
}

/**
 * Scrape the full article content from a URL.
 * Uses a best-effort approach to extract the main article body.
 * Does NOT bypass paywalls — only extracts freely available content.
 */
export async function scrapeArticle(
  url: string
): Promise<{ content: string; imageUrl: string | null } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TheDigest/1.0; +https://thedigest.app)",
        Accept: "text/html",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("html")) return null;

    const html = await response.text();
    return extractArticleContent(html);
  } catch (error) {
    // Timeout, network error, or abort — silently fail
    return null;
  }
}

/**
 * Extract the main article content from HTML.
 */
function extractArticleContent(
  html: string
): { content: string; imageUrl: string | null } {
  const $ = cheerio.load(html);

  // Remove noise elements
  const removeSelectors = [
    "script",
    "style",
    "nav",
    "header",
    "footer",
    "aside",
    ".sidebar",
    ".nav",
    ".header",
    ".footer",
    ".comments",
    ".comment",
    ".social-share",
    ".related-posts",
    ".ad",
    ".advertisement",
    ".promo",
    '[role="navigation"]',
    '[role="banner"]',
    '[role="complementary"]',
    '[aria-hidden="true"]',
  ];

  removeSelectors.forEach((sel) => {
    try {
      $(sel).remove();
    } catch {
      // Ignore selector errors
    }
  });

  // Try to find article content using common selectors
  const articleSelectors = [
    "article",
    '[role="main"]',
    ".article-body",
    ".article-content",
    ".post-content",
    ".entry-content",
    ".story-body",
    ".story-content",
    "#article-body",
    "#article-content",
    ".content-body",
    "main",
  ];

  let articleHtml = "";

  for (const selector of articleSelectors) {
    const el = $(selector).first();
    if (el.length) {
      const text = el.text().trim();
      if (text.length > 200) {
        articleHtml = el.html() || "";
        break;
      }
    }
  }

  // Fallback: use body with noise removed
  if (!articleHtml) {
    articleHtml = $("body").html() || "";
  }

  // Convert to clean text
  const content = convert(articleHtml, {
    wordwrap: false,
    selectors: [
      { selector: "a", options: { ignoreHref: true } },
      { selector: "img", format: "skip" },
    ],
    preserveNewlines: true,
  })
    .replace(/\n{4,}/g, "\n\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  // Extract main image
  const ogImage = $('meta[property="og:image"]').attr("content");
  const twitterImage = $('meta[name="twitter:image"]').attr("content");
  const firstImg = $("article img, main img, .article img")
    .first()
    .attr("src");
  const imageUrl = ogImage || twitterImage || firstImg || null;

  return { content, imageUrl };
}
