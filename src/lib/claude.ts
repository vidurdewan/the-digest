import Anthropic from "@anthropic-ai/sdk";

// Claude API client — lazy-initialized
let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client = new Anthropic({ apiKey });
  return client;
}

export function isClaudeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Model for summarization (balance of quality and cost)
const SUMMARIZATION_MODEL = "claude-sonnet-4-20250514";

// Token pricing (per million tokens, as of 2025)
export const TOKEN_PRICING = {
  input: 3.0, // $3 per million input tokens
  output: 15.0, // $15 per million output tokens
};

export function estimateCost(
  inputTokens: number,
  outputTokens: number
): number {
  return (
    (inputTokens / 1_000_000) * TOKEN_PRICING.input +
    (outputTokens / 1_000_000) * TOKEN_PRICING.output
  );
}

// ─── Brief Summary (used on ingest / card view) ─────────────
export interface BriefSummaryResult {
  brief: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Generate a brief 1-2 sentence teaser for an article.
 * This is the "Level 1" summary shown on the card.
 */
export async function generateBriefSummary(
  title: string,
  content: string
): Promise<BriefSummaryResult | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  // Truncate content to ~2000 chars for brief summary (cost optimization)
  const truncated = content.slice(0, 2000);

  try {
    const response = await anthropic.messages.create({
      model: SUMMARIZATION_MODEL,
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: `Write a 1-2 sentence summary of this article. Be concise, factual, and informative. Focus on the key takeaway.

Title: ${title}

Content:
${truncated}

Respond with ONLY the summary, no labels or prefixes.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return {
      brief: text.trim(),
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch (error) {
    console.error("[Claude] Brief summary error:", error);
    return null;
  }
}

// ─── Full Summary (used on expand / Level 2) ─────────────────
export interface FullSummaryResult {
  theNews: string;
  whyItMatters: string;
  theContext: string;
  keyEntities: Array<{
    name: string;
    type: "company" | "person" | "fund" | "keyword";
  }>;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Generate a full 3-section summary with entity extraction.
 * This is the "Level 2" summary shown when the user expands an article.
 */
export async function generateFullSummary(
  title: string,
  content: string,
  source: string
): Promise<FullSummaryResult | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  // Use more content for full summary, up to ~6000 chars
  const truncated = content.slice(0, 6000);

  try {
    const response = await anthropic.messages.create({
      model: SUMMARIZATION_MODEL,
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `You are an intelligence briefing assistant for a senior executive recruiter at a firm partnering with top-tier VC firms (Sequoia, a16z, Lightspeed). Provide a structured summary of this article.

Title: ${title}
Source: ${source}

Article content:
${truncated}

Respond in EXACTLY this JSON format (no markdown, no code fences):
{
  "theNews": "What happened, factually and concisely. 2-3 sentences.",
  "whyItMatters": "The significance, implications, who is affected. 2-3 sentences tailored to someone in VC/startup recruiting.",
  "theContext": "Background and how this connects to broader trends. 1-2 sentences.",
  "keyEntities": [
    {"name": "Entity Name", "type": "company|person|fund|keyword"}
  ]
}

Include 3-8 key entities. Entity types: company, person, fund, keyword.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON response
    const parsed = JSON.parse(text.trim());

    return {
      theNews: parsed.theNews || "",
      whyItMatters: parsed.whyItMatters || "",
      theContext: parsed.theContext || "",
      keyEntities: (parsed.keyEntities || []).map(
        (e: { name: string; type: string }) => ({
          name: e.name,
          type: ["company", "person", "fund", "keyword"].includes(e.type)
            ? e.type
            : "keyword",
        })
      ),
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch (error) {
    console.error("[Claude] Full summary error:", error);
    return null;
  }
}

// ─── Batch Brief Summaries ───────────────────────────────────
export interface BatchArticle {
  id: string;
  title: string;
  content: string;
}

export interface BatchBriefResult {
  articleId: string;
  brief: string;
}

/**
 * Generate brief summaries for multiple articles in a single API call.
 * More cost-effective than individual calls.
 * Processes up to 10 articles per batch.
 */
export async function generateBatchBriefSummaries(
  articles: BatchArticle[]
): Promise<{
  results: BatchBriefResult[];
  inputTokens: number;
  outputTokens: number;
} | null> {
  const anthropic = getClient();
  if (!anthropic || articles.length === 0) return null;

  // Limit batch size
  const batch = articles.slice(0, 10);

  const articlesText = batch
    .map(
      (a, i) =>
        `[${i + 1}] ID: ${a.id}\nTitle: ${a.title}\nContent: ${a.content.slice(0, 800)}`
    )
    .join("\n\n---\n\n");

  try {
    const response = await anthropic.messages.create({
      model: SUMMARIZATION_MODEL,
      max_tokens: 200 * batch.length,
      messages: [
        {
          role: "user",
          content: `Write a brief 1-2 sentence summary for each of the following ${batch.length} articles. Be concise, factual, and informative.

${articlesText}

Respond in EXACTLY this JSON format (no markdown, no code fences):
[
  {"id": "article-id-here", "brief": "1-2 sentence summary"},
  ...
]`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    const parsed = JSON.parse(text.trim());
    const results: BatchBriefResult[] = Array.isArray(parsed)
      ? parsed.map((r: { id: string; brief: string }) => ({
          articleId: r.id,
          brief: r.brief || "",
        }))
      : [];

    return {
      results,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch (error) {
    console.error("[Claude] Batch brief summary error:", error);
    return null;
  }
}
