import CryptoJS from "crypto-js";

/**
 * Generate a content hash for deduplication.
 * Uses title + URL to create a unique identifier.
 */
export function generateContentHash(title: string, url: string): string {
  const normalized = `${title.toLowerCase().trim()}|${url.toLowerCase().trim()}`;
  return CryptoJS.SHA256(normalized).toString();
}

/**
 * Estimate reading time in minutes based on word count.
 * Average reading speed: 238 words per minute.
 */
export function estimateReadingTime(text: string): number {
  if (!text) return 2;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(wordCount / 238);
  return Math.max(1, Math.min(minutes, 30));
}
