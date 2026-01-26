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

// ─── Source Quality Weighting ─────────────────────────────────
// Higher-weight sources get more detailed analysis and priority in digest
export const SOURCE_QUALITY_TIERS: Record<string, number> = {
  // Tier 1: Premium (weight 3) — deep reporting, unique insights
  "The Information": 3,
  Stratechery: 3,
  Bloomberg: 3,
  "Financial Times": 3,
  "The Economist": 3,
  Reuters: 3,
  "Wall Street Journal": 3,
  // Tier 2: Strong (weight 2) — good analysis, well-sourced
  StrictlyVC: 2,
  "CB Insights": 2,
  Axios: 2,
  Semafor: 2,
  Politico: 2,
  TechCrunch: 2,
  // Tier 3: Standard (weight 1) — aggregation, lighter analysis
  "Morning Brew": 1,
  "The Hustle": 1,
  Finimize: 1,
};

export function getSourceWeight(publication: string): number {
  return SOURCE_QUALITY_TIERS[publication] || 1;
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
 * Includes recruiter-relevant insights, second-order implications, and "So What?" section.
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
          content: `You are a senior intelligence briefing analyst for an executive recruiter at a firm that partners with top-tier VC firms (Sequoia, a16z, Lightspeed, Benchmark, Founders Fund, Greylock, Accel, NEA). Your reader needs deep, actionable analysis — not surface-level summaries.

Source: ${publication} (Quality tier: ${weight >= 3 ? "Premium" : weight >= 2 ? "Strong" : "Standard"})
Subject: ${subject}

Content:
${truncated}

Provide a deep-dive structured analysis. Think about second-order implications, who wins/loses, what this means for talent markets and executive hiring.

Respond in EXACTLY this JSON format (no markdown, no code fences):
{
  "theNews": "What happened? Be specific with names, numbers, and details. Cover the 2-4 most important items. Each as a bullet point, 1-2 sentences.",
  "whyItMatters": "Go DEEP. What are the second-order implications? Who wins and who loses? How does this affect the broader ecosystem? 3-4 sentences. Don't just restate the news — analyze it.",
  "theContext": "Connect to broader market trends, recent deals, or industry shifts. What pattern is this part of? 2-3 sentences.",
  "soWhat": "One bold, opinionated sentence: the single most important takeaway a busy executive should remember from this newsletter.",
  "watchNext": "What should the reader watch for next? A specific development, announcement, or trend to monitor. 1 sentence.",
  "recruiterRelevance": "Is there anything directly relevant to executive recruiting? Flag: leadership changes, new C-suite hires, company scaling (new funding/IPO prep), layoffs/reorgs creating talent availability, or portfolio company movements. If nothing relevant, write 'No direct recruiting signals.' 1-2 sentences."
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

// ─── Daily Digest ────────────────────────────────────────────
export interface DailyDigestResult {
  digest: string;
  sections: {
    relevantToMyWork: string;
    topStories: string;
    marketMoves: string;
    peopleMoves: string;
    trendsAndSignals: string;
    contrarianTake: string;
    oneLineSummary: string;
  };
  inputTokens: number;
  outputTokens: number;
}

/**
 * Generate a consolidated daily digest from multiple newsletters.
 * Deep analysis with recruiter focus, source weighting, contrarian takes, and "So What?" sections.
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
      max_tokens: 2500,
      messages: [
        {
          role: "user",
          content: `You are a senior intelligence analyst writing a daily briefing for an executive recruiter at a firm partnering with top-tier VCs (Sequoia, a16z, Lightspeed, Benchmark, Founders Fund, Greylock, Accel, NEA). The reader needs to be the most informed person in any room.

Source quality tiers are marked — prioritize Premium and Strong sources for key insights. Standard sources are useful for breadth.

Here are today's ${newsletters.length} newsletters:

${newsletterBlocks}

Write a comprehensive daily digest. Go DEEP — don't just summarize, ANALYZE. Connect threads across newsletters. Identify what others will miss.

Respond in EXACTLY this JSON format (no markdown, no code fences):
{
  "relevantToMyWork": "CRITICAL SECTION — Flag anything directly relevant to executive recruiting: C-suite changes, leadership transitions, companies scaling rapidly (just raised funding, IPO prep, hypergrowth), layoffs/reorgs creating talent availability, portfolio company news from Sequoia/a16z/Lightspeed/Benchmark/Founders Fund/Greylock. Each item as a bullet. If nothing, write 'No direct signals today — here is what to keep on radar:' followed by the closest indirect signals.",
  "topStories": "The 3-5 most important stories. Each as a bullet with source in parentheses. 2-3 sentences each — include the SO WHAT in bold at the end of each bullet. Prioritize Premium/Strong sources.",
  "marketMoves": "Key funding rounds, acquisitions, IPO filings, market shifts. Each bullet should end with a bold **So What:** one-liner. 3-5 bullets. Write 'No major deals today.' if nothing.",
  "peopleMoves": "Executive moves, hires, departures, board appointments. Include company, role, and where they came from. 3-5 bullets. Write 'None reported today.' if nothing.",
  "trendsAndSignals": "This is the ANALYSIS section. Don't just list trends — explain WHY they matter from a VC/tech/recruiting perspective. Connect threads across multiple newsletters. Include at least one contrarian take or non-obvious insight. What pattern are most people missing? 4-6 sentences.",
  "contrarianTake": "One provocative, well-reasoned contrarian perspective on today's news. Challenge conventional wisdom. 2-3 sentences.",
  "oneLineSummary": "A bold, memorable one-liner capturing the day's most important signal. Make it quotable."
}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text.trim());

    // Format into readable markdown with So What sections
    const digest = [
      `## Relevant to My Work\n${parsed.relevantToMyWork || "No direct signals today."}`,
      `## Today's One-Liner\n${parsed.oneLineSummary || ""}`,
      `## Top Stories\n${parsed.topStories || ""}`,
      `## Market & Deal Activity\n${parsed.marketMoves || ""}`,
      `## People Moves\n${parsed.peopleMoves || ""}`,
      `## Trends & Signals\n${parsed.trendsAndSignals || ""}`,
      `## Contrarian Take\n${parsed.contrarianTake || ""}`,
    ].join("\n\n");

    return {
      digest,
      sections: {
        relevantToMyWork: parsed.relevantToMyWork || "",
        topStories: parsed.topStories || "",
        marketMoves: parsed.marketMoves || "",
        peopleMoves: parsed.peopleMoves || "",
        trendsAndSignals: parsed.trendsAndSignals || "",
        contrarianTake: parsed.contrarianTake || "",
        oneLineSummary: parsed.oneLineSummary || "",
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
