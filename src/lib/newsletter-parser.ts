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
  /updates@/i,
  /info@.*\.google\.com/i,
  /feedback@/i,
  /team@.*\.google\.com/i,
  /admin@/i,
  /service@/i,
  /helpdesk@/i,
  /customercare@/i,
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
  /action required/i,
  /action needed/i,
  /complete your/i,
  /update your/i,
  /activate your/i,
  /reset your/i,
  /expir(es?|ing|ation)/i,
  /suspicious (activity|sign)/i,
  /welcome to/i,
  /thanks for (signing|registering|joining|subscribing)/i,
  /successfully (created|registered)/i,
  /your (order|booking|reservation|appointment)/i,
  /calendar (invitation|event|reminder)/i,
  /shared .* with you/i,
  /invitation to/i,
  /you have been (added|invited|granted)/i,
  /storage (is )?(full|almost|running)/i,
  /critical.*update/i,
];

// Blocked transactional domains — always exclude emails from these
const BLOCKED_DOMAINS = [
  "google.com",
  "accounts.google.com",
  "apple.com",
  "amazon.com",
  "amazon.co.uk",
  "paypal.com",
  "stripe.com",
  "chase.com",
  "bankofamerica.com",
  "wellsfargo.com",
  "citi.com",
  "capitalone.com",
  "americanexpress.com",
  "discover.com",
  "facebook.com",
  "facebookmail.com",
  "meta.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "linkedin.com",
  "github.com",
  "gitlab.com",
  "microsoft.com",
  "outlook.com",
  "live.com",
  "hotmail.com",
  "yahoo.com",
  "aol.com",
  "icloud.com",
  "dropbox.com",
  "zoom.us",
  "slack.com",
  "notion.so",
  "figma.com",
  "canva.com",
  "shopify.com",
  "squarespace.com",
  "godaddy.com",
  "uber.com",
  "lyft.com",
  "doordash.com",
  "grubhub.com",
  "airbnb.com",
  "booking.com",
  "expedia.com",
  "netflix.com",
  "spotify.com",
  "hulu.com",
  "disneyland.com",
  "disney.com",
  "vercel.com",
  "heroku.com",
  "netlify.com",
  "cloudflare.com",
  "digitalocean.com",
  "aws.amazon.com",
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
 * AGGRESSIVE filtering: requires List-Unsubscribe OR known newsletter domain.
 * Blocks all known transactional domains outright.
 */
export function isNewsletter(message: GmailMessage): boolean {
  const email = message.senderEmail.toLowerCase();
  const subject = message.subject.toLowerCase();
  const domain = email.split("@")[1] || "";

  // 1. HARD BLOCK: emails from blocked transactional domains
  if (BLOCKED_DOMAINS.some((d) => domain === d || domain.endsWith("." + d))) {
    return false;
  }

  // 2. HARD BLOCK: transactional subject lines
  if (TRANSACTIONAL_SUBJECTS.some((pattern) => pattern.test(subject))) {
    return false;
  }

  // 3. Evaluate newsletter signals (needed before transactional sender check)
  const isKnownDomain = KNOWN_NEWSLETTER_DOMAINS.some((d) => domain.includes(d));
  const hasListUnsubscribe = !!message.listUnsubscribe;
  const hasListId = !!message.listId;
  const hasBulkPrecedence = ["bulk", "list"].includes(message.precedence.toLowerCase());

  // 4. BLOCK transactional sender patterns — but allow through if there are
  //    strong newsletter signals (List-Unsubscribe, List-Id, known domain).
  //    Many real newsletters send from noreply@ or updates@ addresses.
  const matchesTransactionalSender = TRANSACTIONAL_SENDERS.some((pattern) => pattern.test(email));
  if (matchesTransactionalSender && !isKnownDomain && !hasListUnsubscribe && !hasListId) {
    return false;
  }

  // 5. REQUIRE at least one strong newsletter signal:
  //    - List-Unsubscribe header
  //    - List-Id header
  //    - Known newsletter platform domain
  //    - Bulk precedence (for non-transactional senders)
  //    - Body unsubscribe link + substantial content (1000+ chars)
  if (hasListUnsubscribe || hasListId) return true;
  if (isKnownDomain) return true;
  if (hasBulkPrecedence && !matchesTransactionalSender) return true;

  // Body-based detection: must have unsubscribe text AND substantial content
  const bodyText = (message.htmlBody + message.textBody).toLowerCase();
  const hasUnsubscribeText =
    bodyText.includes("unsubscribe") ||
    bodyText.includes("email preferences") ||
    bodyText.includes("manage your subscription") ||
    bodyText.includes("opt out") ||
    bodyText.includes("manage notifications");
  const contentLength = Math.max(message.textBody.length, message.htmlBody.length);

  if (hasUnsubscribeText && contentLength > 1000) return true;

  // Default: reject — err on the side of filtering out
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
