import { google, gmail_v1 } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

/**
 * Create an OAuth2 client with the configured credentials.
 */
export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in .env.local"
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate the URL for the user to authorize Gmail access.
 */
export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // Force consent to always get refresh token
  });
}

/**
 * Exchange an authorization code for tokens.
 */
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Create an authenticated Gmail client from stored tokens.
 */
export function getGmailClient(tokens: {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
}): gmail_v1.Gmail {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);
  return google.gmail({ version: "v1", auth: oauth2Client });
}

/**
 * Refresh tokens if expired. Returns updated tokens.
 * Throws a descriptive error on invalid_grant so callers can prompt re-auth.
 */
export async function refreshTokensIfNeeded(tokens: {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
}) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);

  // Check if token is expired or about to expire (5 min buffer)
  const expiryDate = tokens.expiry_date || 0;
  const isExpired = expiryDate < Date.now() + 5 * 60 * 1000;

  if (isExpired && tokens.refresh_token) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      return credentials;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("invalid_grant")) {
        throw new Error(
          "Gmail refresh token expired or revoked. Please disconnect and reconnect Gmail in Settings."
        );
      }
      throw err;
    }
  }

  return tokens;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  senderEmail: string;
  date: string;
  htmlBody: string;
  textBody: string;
  snippet: string;
  listUnsubscribe: string;
  listId: string;
  precedence: string;
}

/**
 * Fetch recent emails from the Gmail inbox.
 * @param gmail Authenticated Gmail client
 * @param maxResults Maximum number of messages to fetch
 * @param afterDate Only fetch messages after this date (RFC 3339)
 */
export async function fetchEmails(
  gmail: gmail_v1.Gmail,
  maxResults: number = 20,
  afterDate?: string
): Promise<GmailMessage[]> {
  // Build query
  let query = "in:inbox";
  if (afterDate) {
    const date = new Date(afterDate);
    const formatted = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    query += ` after:${formatted}`;
  }

  // List messages
  const listResponse = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: query,
  });

  const messageIds = listResponse.data.messages || [];
  if (messageIds.length === 0) return [];

  // Fetch all messages in parallel
  const results = await Promise.all(
    messageIds.map(async (msg) => {
      try {
        const fullMsg = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "full",
        });
        return parseGmailMessage(fullMsg.data);
      } catch (err) {
        console.error(`Failed to fetch message ${msg.id}:`, err);
        return null;
      }
    })
  );

  return results.filter((m): m is GmailMessage => m !== null);
}

/**
 * Parse a raw Gmail API message into our simplified format.
 */
function parseGmailMessage(
  message: gmail_v1.Schema$Message
): GmailMessage | null {
  if (!message.id || !message.payload) return null;

  const headers = message.payload.headers || [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ||
    "";

  const subject = getHeader("Subject");
  const from = getHeader("From");
  const date = getHeader("Date");

  // Extract sender email from "Name <email>" format
  const emailMatch = from.match(/<([^>]+)>/);
  const senderEmail = emailMatch ? emailMatch[1] : from;

  // Extract body
  const { htmlBody, textBody } = extractBody(message.payload);

  return {
    id: message.id,
    threadId: message.threadId || "",
    subject,
    from,
    senderEmail,
    date,
    htmlBody,
    textBody,
    snippet: message.snippet || "",
    listUnsubscribe: getHeader("List-Unsubscribe"),
    listId: getHeader("List-Id"),
    precedence: getHeader("Precedence"),
  };
}

/**
 * Recursively extract HTML and text body from Gmail message payload.
 */
function extractBody(payload: gmail_v1.Schema$MessagePart): {
  htmlBody: string;
  textBody: string;
} {
  let htmlBody = "";
  let textBody = "";

  if (payload.mimeType === "text/html" && payload.body?.data) {
    htmlBody = decodeBase64Url(payload.body.data);
  } else if (payload.mimeType === "text/plain" && payload.body?.data) {
    textBody = decodeBase64Url(payload.body.data);
  }

  // Check parts recursively
  if (payload.parts) {
    for (const part of payload.parts) {
      const result = extractBody(part);
      if (result.htmlBody) htmlBody = result.htmlBody;
      if (result.textBody) textBody = result.textBody;
    }
  }

  return { htmlBody, textBody };
}

/**
 * Decode base64url-encoded string (Gmail API format).
 */
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}
