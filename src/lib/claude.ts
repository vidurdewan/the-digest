import Anthropic from "@anthropic-ai/sdk";
import { getNewsletterSourceTier, tierToWeight } from "@/lib/source-tiers";

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

// ─── Source Quality Weighting ─────────────────────────────────
// Delegates to source-tiers.ts for the canonical tier config.
// Weight: tier 1 (Edge) → 3, tier 2 (Quality) → 2, tier 3 (Mainstream) → 1

export function getSourceWeight(publication: string): number {
  const tier = getNewsletterSourceTier(publication);
  return tierToWeight(tier);
}

// ─── Newsletter Summary ──────────────────────────────────────
export interface NewsletterSummaryResult {
  theNews: string;
  whyItMatters: string;
  theContext: string;
  soWhat: string;
  watchNext: string;
  recruiterRelevance: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Generate a structured summary for a newsletter with deep analysis.
 * Broad intelligence briefing with optional work-relevant callout.
 */
export async function generateNewsletterSummary(
  publication: string,
  subject: string,
  content: string
): Promise<NewsletterSummaryResult | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  const weight = getSourceWeight(publication);
  const truncated = content.slice(0, weight >= 2 ? 10000 : 6000);

  try {
    const response = await anthropic.messages.create({
      model: SUMMARIZATION_MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `You are a senior intelligence briefing analyst. Your reader is a well-connected professional who wants deep, actionable analysis across VC/tech, markets, geopolitics, and the business world.

FORMATTING RULES:
- Bold all **company names** and **people names** so they pop when scanning.
- Each item in "theNews" should be ONE story per bullet, not multiple crammed together.

Source: ${publication} (Quality tier: ${weight >= 3 ? "Premium" : weight >= 2 ? "Strong" : "Standard"})
Subject: ${subject}

Content:
${truncated}

Respond in EXACTLY this JSON format (no markdown, no code fences):
{
  "theNews": "What happened? Be specific with **names**, numbers, and details. Cover the 2-4 most important items. Each as a separate bullet point, 1-2 sentences each. Bold company and people names.",
  "whyItMatters": "Go DEEP. What are the second-order implications? Who wins and who loses? How does this affect the broader ecosystem? 3-4 sentences. Don't just restate the news — analyze it.",
  "theContext": "Connect to broader market trends, recent deals, or industry shifts. What pattern is this part of? 2-3 sentences.",
  "soWhat": "One bold, opinionated sentence: the single most important takeaway from this newsletter.",
  "watchNext": "What should the reader watch for next? A specific development, announcement, or trend to monitor. 1 sentence.",
  "recruiterRelevance": "Brief optional callout: any leadership changes, company scaling signals (funding/IPO), or talent availability (layoffs/reorgs)? If nothing: 'No direct signals.' 1 sentence max."
}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text.trim());

    return {
      theNews: parsed.theNews || "",
      whyItMatters: parsed.whyItMatters || "",
      theContext: parsed.theContext || "",
      soWhat: parsed.soWhat || "",
      watchNext: parsed.watchNext || "",
      recruiterRelevance: parsed.recruiterRelevance || "",
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch (error) {
    console.error("[Claude] Newsletter summary error:", error);
    return null;
  }
}

// ─── VIP Newsletter Summary ─────────────────────────────────
/**
 * Generate a full-depth "distilled" summary for VIP newsletters.
 * Uses more content (15,000 chars) and higher max_tokens (2000)
 * to preserve full reasoning, key arguments, and all important details.
 */
export async function generateVIPNewsletterSummary(
  publication: string,
  subject: string,
  content: string
): Promise<NewsletterSummaryResult | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  // VIP gets much more content — up to 15,000 chars
  const truncated = content.slice(0, 15000);

  try {
    const response = await anthropic.messages.create({
      model: SUMMARIZATION_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are a senior intelligence briefing analyst. This newsletter is from a MUST-READ source. Distill it fully — preserve the complete reasoning, key arguments, and ALL important details. Same depth, fewer words, but nothing important lost.

Your reader is a well-connected professional who wants deep, actionable analysis across VC/tech, markets, geopolitics, and the business world.

FORMATTING RULES:
- Bold all **company names** and **people names** so they pop when scanning.
- Each item in "theNews" should be ONE story per bullet, not multiple crammed together.
- Be thorough — this is a premium source the reader trusts deeply. Capture nuance.

Source: ${publication} (VIP — must-read source)
Subject: ${subject}

Content:
${truncated}

Respond in EXACTLY this JSON format (no markdown, no code fences):
{
  "theNews": "What happened? Be specific with **names**, numbers, and details. Cover ALL important items from this newsletter. Each as a separate bullet point, 2-3 sentences each. Bold company and people names. Don't skip anything significant.",
  "whyItMatters": "Go DEEP. What are the second-order and third-order implications? Who wins and who loses? How does this affect the broader ecosystem? 4-6 sentences. Preserve the author's key arguments and reasoning.",
  "theContext": "Connect to broader market trends, recent deals, or industry shifts. What pattern is this part of? What historical parallels exist? 3-4 sentences.",
  "soWhat": "The single most important takeaway — bold and opinionated. 1-2 sentences.",
  "watchNext": "What should the reader watch for next? Be specific: name companies, people, dates, events. 2-3 sentences.",
  "recruiterRelevance": "Leadership changes, company scaling signals (funding/IPO), or talent availability (layoffs/reorgs)? If nothing: 'No direct signals.' 1-2 sentences."
}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text.trim());

    return {
      theNews: parsed.theNews || "",
      whyItMatters: parsed.whyItMatters || "",
      theContext: parsed.theContext || "",
      soWhat: parsed.soWhat || "",
      watchNext: parsed.watchNext || "",
      recruiterRelevance: parsed.recruiterRelevance || "",
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch (error) {
    console.error("[Claude] VIP newsletter summary error:", error);
    return null;
  }
}

// ─── Daily Digest ────────────────────────────────────────────
export interface DailyDigestResult {
  digest: string;
  sections: {
    oneLineSummary: string;
    topStories: string;
    marketMoves: string;
    peopleMoves: string;
    trendsAndSignals: string;
    contrarianTake: string;
    workRelevant: string;
  };
  inputTokens: number;
  outputTokens: number;
}

/**
 * Generate a consolidated daily digest from multiple newsletters.
 * Broad intelligence briefing covering VC/tech, markets, geopolitics, science.
 * Source-weighted, with "Bottom line" per section and tight formatting.
 */
export async function generateDailyDigest(
  newsletters: Array<{ publication: string; subject: string; content: string }>
): Promise<DailyDigestResult | null> {
  const anthropic = getClient();
  if (!anthropic || newsletters.length === 0) return null;

  // Sort by source quality weight (premium sources first, more content)
  const weighted = newsletters
    .map((nl) => ({ ...nl, weight: getSourceWeight(nl.publication) }))
    .sort((a, b) => b.weight - a.weight);

  const newsletterBlocks = weighted
    .map(
      (nl, i) =>
        `[${i + 1}] ${nl.publication} (Quality: ${nl.weight >= 3 ? "Premium" : nl.weight >= 2 ? "Strong" : "Standard"}) — "${nl.subject}"\n${nl.content.slice(0, nl.weight >= 3 ? 5000 : nl.weight >= 2 ? 3500 : 2000)}`
    )
    .join("\n\n---\n\n");

  try {
    const response = await anthropic.messages.create({
      model: SUMMARIZATION_MODEL,
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `You are a senior intelligence analyst writing a daily briefing. The reader is a well-connected professional who wants a BROAD overview of what's happening across VC/tech, financial markets, geopolitics, science, and the business world. They want to be the most informed person in any room.

Source quality tiers are marked — prioritize Premium and Strong sources. Standard sources provide breadth.

CRITICAL FORMATTING RULES:
- Each bullet = ONE story only. Never combine multiple stories in one bullet.
- Bold all **company names** and **people names** so they pop when scanning.
- SOURCES: End each bullet with source citations in square brackets: [Bloomberg] [FT]. If a story was covered by multiple newsletters, show ALL of them. The reader needs to know exactly which newsletter each piece of information came from.
- SO WHAT: After the story text and source citations, you MUST put the "So What" on a SEPARATE LINE using a literal newline character (\\n) in the JSON string. The format is: "- Story text here. [Source1] [Source2]\\n→ So What: One-sentence takeaway." The \\n is critical — "→ So What:" must NEVER appear on the same line as the story.
- At the END of each section, add "Bottom line: " as a bold one-sentence theme summary.
- Keep bullets concise: 2 sentences max for the story, 1 sentence for So What.

EXAMPLE OF CORRECT BULLET FORMAT:
"- **EU** launches formal probe into **Elon Musk**'s **X** over Grok AI chatbot flooding platform with deepfake images. [Bloomberg] [FT]\\n→ So What: This sets up a potential collision between Trump's tech allies and European regulators that could reshape global AI governance."

Here are today's ${newsletters.length} newsletters:

${newsletterBlocks}

Respond in EXACTLY this JSON format (no markdown code fences):
{
  "oneLineSummary": "A bold, memorable one-liner capturing today's most important signal. Make it quotable.",
  "topStories": "The 3-5 most important stories across ALL topics (not just tech). Each bullet: 2 sentences max with **bold names**, then [Source1] [Source2] citations in square brackets. Then a LITERAL NEWLINE (\\n) followed by '→ So What: ' and a one-sentence implication. After all bullets, add a blank line then 'Bottom line: ' with one sentence.",
  "marketMoves": "Key funding rounds, acquisitions, IPO filings, market shifts, economic data. Each bullet = ONE deal/move with **bold names** and [Source] citation. Then \\n followed by '→ So What: ' takeaway. End with 'Bottom line: ' summary. Write 'No major deals reported.' if nothing.",
  "peopleMoves": "TIGHT FORMAT for each move:\n- **Name** (previous role at **Previous Co**) → **New Company**, New Role. One line on why it's notable. [Source]\nIf no significant moves: 'No significant moves detected today.'\nEnd with 'Bottom line: ' if there are moves.",
  "trendsAndSignals": "The ANALYSIS section. Cover trends across ALL domains — VC/tech, markets, geopolitics, science, regulation. Don't just list — explain WHY each matters. Connect threads across newsletters. Cite sources with [Source Name]. What pattern are most people missing? 4-6 sentences. End with 'Bottom line: ' one-sentence theme.",
  "contrarianTake": "A punchy hot take in 2-3 sentences MAX. Challenge conventional wisdom on today's biggest story. Be provocative but well-reasoned. No hedging. Cite [Source] if referencing specific info.",
  "workRelevant": "SMALL optional callout: Flag 1-3 items relevant to executive recruiting — C-suite changes, companies scaling (new funding/IPO prep), layoffs creating talent availability, portfolio company news. Include [Source] citations. Keep it brief — 1-2 bullets max. If nothing: 'No direct signals today.'"
}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text.trim());

    // Format into readable markdown — broad overview first, work callout last
    const digest = [
      `## Today's One-Liner\n${parsed.oneLineSummary || ""}`,
      `## Top Stories\n${parsed.topStories || ""}`,
      `## Market & Deal Activity\n${parsed.marketMoves || ""}`,
      `## People Moves\n${parsed.peopleMoves || ""}`,
      `## Trends & Signals\n${parsed.trendsAndSignals || ""}`,
      `## Contrarian Take\n${parsed.contrarianTake || ""}`,
      `## Work Radar\n${parsed.workRelevant || "No direct signals today."}`,
    ].join("\n\n");

    return {
      digest,
      sections: {
        oneLineSummary: parsed.oneLineSummary || "",
        topStories: parsed.topStories || "",
        marketMoves: parsed.marketMoves || "",
        peopleMoves: parsed.peopleMoves || "",
        trendsAndSignals: parsed.trendsAndSignals || "",
        contrarianTake: parsed.contrarianTake || "",
        workRelevant: parsed.workRelevant || "",
      },
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch (error) {
    console.error("[Claude] Daily digest error:", error);
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
