/**
 * Deciphering Summary Generator
 *
 * Generates 6-section "Deciphering" analysis for primary documents
 * (SEC filings, Federal Reserve releases) using Claude.
 *
 * Sections:
 *   1. The Filing — What is this document, who filed it
 *   2. What Changed — Language signaling change
 *   3. What's Buried — Footnotes, risk factors, related-party transactions
 *   4. What the Jargon Means — Legal/financial translation
 *   5. The Real Story — What it actually tells us
 *   6. Watch Next — What to monitor going forward
 */

import Anthropic from "@anthropic-ai/sdk";
import type { DocumentType, DecipheringSummary, Entity } from "@/types";
import { supabase, isSupabaseConfigured } from "./supabase";
import { recordUsage, checkBudget } from "./cost-tracker";

// Claude API client — lazy-initialized
let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client = new Anthropic({ apiKey });
  return client;
}

const SUMMARIZATION_MODEL = "claude-sonnet-4-20250514";

export interface DecipheringResult {
  deciphering: DecipheringSummary;
  keyEntities: Entity[];
  inputTokens: number;
  outputTokens: number;
}

/**
 * Get document-type-specific prompt instructions.
 */
function getDocumentTypeInstructions(documentType: DocumentType): string {
  switch (documentType) {
    case "8-K":
      return `This is an SEC 8-K filing (Current Report — material events).
FOCUS ON:
- The specific Item number(s) and what they indicate (e.g., Item 2.02 = earnings results, Item 1.01 = material agreement, Item 5.02 = departure/appointment of officers)
- What material event triggered this filing
- Any embedded exhibits (press releases, financial statements)
- Item 2.02 filings often contain the earnings press release — extract key financial metrics`;

    case "S-1":
      return `This is an SEC S-1 filing (IPO registration statement).
FOCUS ON:
- Business model and revenue streams
- Key risk factors (especially unusual or company-specific ones)
- Use of proceeds — what they plan to do with IPO funds
- Cap table highlights, insider ownership, dual-class structure
- Growth metrics and path to profitability
- Competitive landscape as they describe it`;

    case "10-K":
      return `This is an SEC 10-K filing (Annual Report).
FOCUS ON:
- MD&A (Management Discussion & Analysis) — look for shifts in tone, strategy, or outlook vs. prior year
- Revenue composition changes, segment growth/decline
- Risk factor changes from prior filing
- Off-balance-sheet arrangements and contingent liabilities
- Executive compensation changes
- Related-party transactions`;

    case "fed-release":
      return `This is a Federal Reserve press release or policy statement.
FOCUS ON:
- Forward guidance language changes ("patient", "transitory", "restrictive", "appropriate")
- Dot plot implications and rate path signals
- Balance sheet (QT/QE) changes
- Dissents — who voted differently and why
- Economic projections shifts (GDP, unemployment, inflation forecasts)
- Any mention of specific sectors (housing, labor, financial stability)`;
  }
}

/**
 * Generate a Deciphering summary for a primary document.
 */
export async function generateDecipheringSummary(
  title: string,
  content: string,
  documentType: DocumentType,
  companyName?: string
): Promise<DecipheringResult | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  // Use up to 15,000 chars (matching VIP newsletter depth)
  const truncated = content.slice(0, 15000);
  const docInstructions = getDocumentTypeInstructions(documentType);

  const companyContext = companyName ? `Company: ${companyName}\n` : "";

  try {
    const response = await anthropic.messages.create({
      model: SUMMARIZATION_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are an expert regulatory filing analyst working for a senior intelligence briefing team. Analyze this primary document and produce a "Deciphering" analysis.

${docInstructions}

${companyContext}Document Type: ${documentType}
Title: ${title}

Document Content:
${truncated}

Respond in EXACTLY this JSON format (no markdown, no code fences):
{
  "theFiling": "What is this document? Who filed it and when? What type of filing is it? 2-3 sentences.",
  "whatChanged": "What language signals change? Look for: 'compared to prior year', 'amendment to', 'revised from', 'effective immediately', 'material change'. What is different from the status quo? 2-4 sentences.",
  "whatsBuried": "What's hidden in footnotes, risk factors, or exhibits? Any related-party transactions, contingent liabilities, or litigation updates? What would a careful reader catch that a headline scanner would miss? 2-4 sentences.",
  "whatTheJargonMeans": "Translate the most important legal/financial/regulatory jargon into plain English. Pick the 2-4 most critical terms or phrases and explain what they actually mean for investors or observers.",
  "theRealStory": "Cut through the filing language — what does this actually tell us? What is the company or institution really signaling? What strategic move or shift does this represent? 2-3 sentences. Be direct and analytical.",
  "watchNext": "What should we monitor going forward? Specific dates, follow-up filings, earnings calls, regulatory deadlines, or market reactions to watch. 1-3 sentences.",
  "keyEntities": [
    {"name": "Entity Name", "type": "company|person|fund|keyword"}
  ]
}

Include 3-8 key entities. Be precise and analytical — this reader is sophisticated and wants the substance, not summaries of summaries.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    const parsed = JSON.parse(text.trim());

    return {
      deciphering: {
        theFiling: parsed.theFiling || "",
        whatChanged: parsed.whatChanged || "",
        whatsBuried: parsed.whatsBuried || "",
        whatTheJargonMeans: parsed.whatTheJargonMeans || "",
        theRealStory: parsed.theRealStory || "",
        watchNext: parsed.watchNext || "",
      },
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
    console.error("[Deciphering] Generation error:", error);
    return null;
  }
}

/**
 * Batch pipeline: generate and store Deciphering summaries for primary documents.
 * Checks budget before each generation.
 */
export async function summarizeDecipheringBatch(
  articles: Array<{
    id: string;
    title: string;
    content: string;
    documentType: DocumentType;
    companyName?: string;
  }>
): Promise<{
  generated: number;
  skipped: number;
  errors: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}> {
  const stats = {
    generated: 0,
    skipped: 0,
    errors: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
  };

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("[Deciphering] Claude not configured, skipping");
    stats.skipped = articles.length;
    return stats;
  }

  // Check budget
  const { allowed, usage } = await checkBudget();
  if (!allowed) {
    console.log(
      `[Deciphering] Over daily budget ($${(usage.costCents / 100).toFixed(2)}). Skipping.`
    );
    stats.skipped = articles.length;
    return stats;
  }

  // Check which articles already have deciphering summaries
  if (isSupabaseConfigured() && supabase) {
    const articleIds = articles.map((a) => a.id);
    const { data: existing } = await supabase
      .from("summaries")
      .select("article_id, deciphering")
      .in("article_id", articleIds)
      .not("deciphering", "is", null);

    if (existing) {
      const existingIds = new Set(existing.map((e) => e.article_id));
      const remaining = articles.filter((a) => !existingIds.has(a.id));
      stats.skipped += articles.length - remaining.length;
      articles = remaining;
    }
  }

  if (articles.length === 0) {
    return stats;
  }

  // Process one at a time (these are expensive, detailed analyses)
  for (const article of articles) {
    // Re-check budget before each article
    const budgetCheck = await checkBudget();
    if (!budgetCheck.allowed) {
      stats.skipped += 1;
      continue;
    }

    const result = await generateDecipheringSummary(
      article.title,
      article.content,
      article.documentType,
      article.companyName
    );

    if (result) {
      stats.totalInputTokens += result.inputTokens;
      stats.totalOutputTokens += result.outputTokens;

      // Record API usage
      await recordUsage(result.inputTokens, result.outputTokens);

      // Store deciphering in summaries table
      if (isSupabaseConfigured() && supabase) {
        try {
          const { error } = await supabase.from("summaries").upsert(
            {
              article_id: article.id,
              deciphering: result.deciphering,
              key_entities: result.keyEntities,
              tokens_used: result.inputTokens + result.outputTokens,
              model_used: SUMMARIZATION_MODEL,
              generated_at: new Date().toISOString(),
            },
            { onConflict: "article_id" }
          );

          if (error) {
            console.error("[Deciphering] Store error:", error.message);
            stats.errors++;
          } else {
            stats.generated++;
          }
        } catch {
          stats.errors++;
        }
      } else {
        stats.generated++;
      }
    } else {
      stats.errors++;
    }
  }

  return stats;
}
