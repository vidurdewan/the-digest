import { supabase, isSupabaseConfigured } from "./supabase";
import { estimateCost } from "./claude";
import * as fs from "fs";
import * as path from "path";

// Default daily budget: $5.00 (500 cents) — raised from $1.00 for initial data population
const DEFAULT_DAILY_BUDGET_CENTS = 500;

interface UsageRecord {
  date: string; // YYYY-MM-DD
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  callCount: number;
}

interface UsageStore {
  records: Record<string, UsageRecord>;
}

// Local file path for usage tracking (fallback when Supabase not configured)
const LOCAL_USAGE_PATH = path.join(process.cwd(), ".ai-usage.json");

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Local File Storage ──────────────────────────────────────
function readLocalUsage(): UsageStore {
  try {
    if (fs.existsSync(LOCAL_USAGE_PATH)) {
      return JSON.parse(fs.readFileSync(LOCAL_USAGE_PATH, "utf-8"));
    }
  } catch {
    // Ignore read errors
  }
  return { records: {} };
}

function writeLocalUsage(store: UsageStore): void {
  try {
    fs.writeFileSync(LOCAL_USAGE_PATH, JSON.stringify(store, null, 2));
  } catch {
    console.error("[CostTracker] Failed to write local usage file");
  }
}

// ─── Record Usage ────────────────────────────────────────────
/**
 * Record token usage from an API call.
 * Stores in Supabase if configured, otherwise local file.
 */
export async function recordUsage(
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  const costDollars = estimateCost(inputTokens, outputTokens);
  const costCents = Math.round(costDollars * 100);
  const today = getTodayKey();

  if (isSupabaseConfigured() && supabase) {
    try {
      // Upsert daily usage record
      const { data: existing } = await supabase
        .from("api_usage")
        .select("*")
        .eq("date", today)
        .single();

      if (existing) {
        await supabase
          .from("api_usage")
          .update({
            input_tokens: existing.input_tokens + inputTokens,
            output_tokens: existing.output_tokens + outputTokens,
            cost_cents: existing.cost_cents + costCents,
            call_count: existing.call_count + 1,
          })
          .eq("date", today);
      } else {
        await supabase.from("api_usage").insert({
          date: today,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cost_cents: costCents,
          call_count: 1,
        });
      }
    } catch (error) {
      console.error("[CostTracker] Supabase error, falling back to local:", error);
      recordUsageLocal(today, inputTokens, outputTokens, costCents);
    }
  } else {
    recordUsageLocal(today, inputTokens, outputTokens, costCents);
  }
}

function recordUsageLocal(
  date: string,
  inputTokens: number,
  outputTokens: number,
  costCents: number
): void {
  const store = readLocalUsage();
  const existing = store.records[date];
  if (existing) {
    existing.inputTokens += inputTokens;
    existing.outputTokens += outputTokens;
    existing.costCents += costCents;
    existing.callCount += 1;
  } else {
    store.records[date] = {
      date,
      inputTokens,
      outputTokens,
      costCents,
      callCount: 1,
    };
  }
  writeLocalUsage(store);
}

// ─── Get Daily Usage ─────────────────────────────────────────
export interface DailyUsage {
  date: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  callCount: number;
  budgetCents: number;
  budgetUsedPercent: number;
  isOverBudget: boolean;
}

export async function getDailyUsage(
  date?: string
): Promise<DailyUsage> {
  const targetDate = date || getTodayKey();
  const budgetCents = DEFAULT_DAILY_BUDGET_CENTS;

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase
        .from("api_usage")
        .select("*")
        .eq("date", targetDate)
        .single();

      if (data) {
        const costCents = data.cost_cents || 0;
        return {
          date: targetDate,
          inputTokens: data.input_tokens || 0,
          outputTokens: data.output_tokens || 0,
          costCents,
          callCount: data.call_count || 0,
          budgetCents,
          budgetUsedPercent: Math.round((costCents / budgetCents) * 100),
          isOverBudget: costCents >= budgetCents,
        };
      }
    } catch {
      // Fall through to local
    }
  }

  // Local fallback
  const store = readLocalUsage();
  const record = store.records[targetDate];
  const costCents = record?.costCents || 0;

  return {
    date: targetDate,
    inputTokens: record?.inputTokens || 0,
    outputTokens: record?.outputTokens || 0,
    costCents,
    callCount: record?.callCount || 0,
    budgetCents,
    budgetUsedPercent: Math.round((costCents / budgetCents) * 100),
    isOverBudget: costCents >= budgetCents,
  };
}

// ─── Budget Check ────────────────────────────────────────────
/**
 * Check if we're within budget before making an API call.
 * Returns true if we can proceed, false if over budget.
 */
export async function checkBudget(): Promise<{
  allowed: boolean;
  usage: DailyUsage;
}> {
  const usage = await getDailyUsage();
  return {
    allowed: !usage.isOverBudget,
    usage,
  };
}

// ─── Usage History ───────────────────────────────────────────
export async function getUsageHistory(
  days: number = 7
): Promise<DailyUsage[]> {
  const results: DailyUsage[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const usage = await getDailyUsage(dateStr);
    results.push(usage);
  }

  return results;
}
