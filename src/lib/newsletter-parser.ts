import * as cheerio from "cheerio";
import { convert } from "html-to-text";
import type { GmailMessage } from "./gmail";

export interface ParsedNewsletter {
  gmailMessageId: string;
  publication: string;
  subject: string;
  senderEmail: string;
  receivedAt: string;
  contentText: string;
  contentHtml: string;
}

// Transactional / non-newsletter sender patterns to exclude
const TRANSACTIONAL_SENDERS = [
  /noreply@.*google\.com/i,
  /no-?reply@/i,
  /notifications?@/i,
  /alerts?@/i,
  /security@/i,
  /account.*@/i,
  /billing@/i,
  /support@/i,
  /receipts?@/i,
  /orders?@/i,
  /shipping@/i,
  /verify@/i,
  /confirm@/i,
  /donotreply@/i,
  /postmaster@/i,
  /mailer-daemon@/i,
];

// Transactional subject patterns
const TRANSACTIONAL_SUBJECTS = [
  /password reset/i,
  /verify your/i,
  /confirm your/i,
  /sign.?in/i,
  /log.?in/i,
  /security alert/i,
  /two.?factor/i,
  /verification code/i,
  /order confirm/i,
  /shipping confirm/i,
  /payment received/i,
  /invoice/i,
  /receipt for/i,
  /your .* has shipped/i,
  /delivery notification/i,
  /google alert/i,
];

// Known newsletter sender domains (strong positive signal)
const KNOWN_NEWSLETTER_DOMAINS = [
  "substack.com",
  "morningbrew.com",
  "theinformation.com",
  "axios.com",
  "finimize.com",
  "thehustle.co",
  "strictlyvc.com",
  "cbinsights.com",
  "techcrunch.com",
  "bloomberg.com",
  "reuters.com",
  "ft.com",
  "economist.com",
  "politico.com",
  "semafor.com",
  "beehiiv.com",
  "convertkit.com",
  "mailchimp.com",
  "buttondown.email",
  "revue.email",
  "ghost.io",
  "sendinblue.com",
  "campaignmonitor.com",
  "constantcontact.com",
  "getresponse.com",
  "mailerlite.com",
];

/**
 * Detect whether a Gmail message is a newsletter (vs transactional/alert).
 * Uses multiple signals: headers, sender patterns, subject, and body content.
 */
export function isNewsletter(message: GmailMessage): boolean {
  const email = message.senderEmail.toLowerCase();
  const subject = message.subject.toLowerCase();
  const domain = email.split("@")[1] || "";

  // Strong exclusion: transactional senders
  if (TRANSACTIONAL_SENDERS.some((pattern) => pattern.test(email))) {
    // Exception: some newsletters use noreply@ but have List-Unsubscribe
    if (!message.listUnsubscribe && !message.listId) {
      return false;
    }
  }

  // Strong exclusion: transactional subjects
  if (TRANSACTIONAL_SUBJECTS.some((pattern) => pattern.test(subject))) {
    return false;
  }

  // Strong positive: List-Unsubscribe header
  if (message.listUnsubscribe) return true;

  // Strong positive: List-Id header
  if (message.listId) return true;

  // Strong positive: Precedence: bulk or list
  const prec = message.precedence.toLowerCase();
  if (prec === "bulk" || prec === "list") return true;

  // Positive: known newsletter platform domain
  if (KNOWN_NEWSLETTER_DOMAINS.some((d) => domain.includes(d))) return true;

  // Moderate positive: body contains unsubscribe link
  const bodyText = (message.htmlBody + message.textBody).toLowerCase();
  if (bodyText.includes("unsubscribe") || bodyText.includes("email preferences") || bodyText.includes("manage your subscription")) {
    // Extra check: must have substantial content (not a short transactional email)
    const contentLength = message.textBody.length || message.htmlBody.length;
    if (contentLength > 500) return true;
  }

  return false;
}

/**
 * Parse a Gmail message into a clean newsletter format.
 */
export function parseNewsletter(message: GmailMessage): ParsedNewsletter {
  const publication = extractPublicationName(message.from);
  const contentHtml = message.htmlBody || "";
  const contentText = contentHtml
    ? cleanHtmlToText(contentHtml)
    : message.textBody || message.snippet;

  return {
    gmailMessageId: message.id,
    publication,
    subject: message.subject,
    senderEmail: message.senderEmail,
    receivedAt: new Date(message.date).toISOString(),
    contentText,
    contentHtml,
  };
}

/**
 * Extract a clean publication name from the "From" header.
 * "Morning Brew <crew@morningbrew.com>" -> "Morning Brew"
 * "newsletter@theinformation.com" -> "The Information"
 */
function extractPublicationName(from: string): string {
  // Try to get the display name from "Name <email>"
  const nameMatch = from.match(/^"?([^"<]+)"?\s*</);
  if (nameMatch) {
    return nameMatch[1].trim();
  }

  // Fall back to domain-based name
  const emailMatch = from.match(/<([^>]+)>/) || from.match(/([^\s]+@[^\s]+)/);
  if (emailMatch) {
    const email = emailMatch[1];
    const domain = email.split("@")[1];
    if (domain) {
      // Known publication mappings
      const knownPublications: Record<string, string> = {
        "morningbrew.com": "Morning Brew",
        "theinformation.com": "The Information",
        "axios.com": "Axios",
        "substack.com": "Substack",
        "finimize.com": "Finimize",
        "thehustle.co": "The Hustle",
        "strictlyvc.com": "StrictlyVC",
        "cbinsights.com": "CB Insights",
        "techcrunch.com": "TechCrunch",
        "bloomberg.com": "Bloomberg",
        "reuters.com": "Reuters",
        "ft.com": "Financial Times",
        "economist.com": "The Economist",
        "politico.com": "Politico",
        "semafor.com": "Semafor",
      };

      if (knownPublications[domain]) {
        return knownPublications[domain];
      }

      // Generate name from domain
      return domain
        .replace(/\.(com|org|net|io|co)$/, "")
        .split(".")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }
  }

  return from.trim() || "Unknown Publication";
}

/**
 * Convert HTML newsletter content to clean readable text.
 * Strips ads, tracking pixels, footers, and unnecessary formatting.
 */
function cleanHtmlToText(html: string): string {
  const $ = cheerio.load(html);

  // Remove common newsletter noise
  const removeSelectors = [
    // Tracking pixels and hidden content
    'img[width="1"]',
    'img[height="1"]',
    '[style*="display:none"]',
    '[style*="display: none"]',
    // Unsubscribe sections
    '[class*="unsubscribe"]',
    '[class*="footer"]',
    '[id*="footer"]',
    // Social media links at bottom
    '[class*="social"]',
    // Ads
    '[class*="advertisement"]',
    '[class*="sponsor"]',
    '[class*="promo"]',
    // Email client preheaders
    '[class*="preheader"]',
    '[style*="max-height:0"]',
  ];

  removeSelectors.forEach((selector) => {
    try {
      $(selector).remove();
    } catch {
      // Ignore selector errors
    }
  });

  // Convert cleaned HTML to text
  const text = convert($.html(), {
    wordwrap: false,
    selectors: [
      { selector: "a", options: { ignoreHref: true } },
      { selector: "img", format: "skip" },
      { selector: "table", format: "dataTable" },
    ],
    preserveNewlines: true,
  });

  // Clean up excessive whitespace while preserving paragraph breaks
  return text
    .replace(/\n{4,}/g, "\n\n\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n /g, "\n")
    .trim();
}

/**
 * Extract key sections from a newsletter (best-effort heuristic).
 * Returns the main content, stripped of headers/footers.
 */
export function extractMainContent(html: string): string {
  if (!html) return "";

  const $ = cheerio.load(html);

  // Try to find the main content area
  const mainSelectors = [
    '[class*="content"]',
    '[class*="body"]',
    '[class*="article"]',
    '[class*="main"]',
    "article",
    "main",
    ".container",
  ];

  for (const selector of mainSelectors) {
    const el = $(selector).first();
    if (el.length && el.text().trim().length > 200) {
      return convert(el.html() || "", {
        wordwrap: false,
        selectors: [
          { selector: "a", options: { ignoreHref: true } },
          { selector: "img", format: "skip" },
        ],
      }).trim();
    }
  }

  // Fallback: just clean the whole thing
  return cleanHtmlToText(html);
}
