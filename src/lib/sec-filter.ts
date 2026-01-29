/**
 * SEC Filing Relevance Filter
 *
 * Filters SEC EDGAR filings to only include companies that are relevant:
 *   1. Companies on the user's watchlist (Supabase)
 *   2. Companies mentioned in recent articles (key_entities, last 7 days)
 *   3. Hardcoded major companies list (~700+ names)
 *
 * Non-SEC articles pass through unchanged.
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import type { RawArticle } from "./rss-fetcher";

// ─── Major Companies List ────────────────────────────────────
// FAANG, top banks, major startups, unicorns, significant public companies
export const MAJOR_COMPANIES: string[] = [
  // Big Tech
  "Apple", "Microsoft", "Google", "Alphabet", "Amazon", "Meta",
  "Nvidia", "Tesla", "Netflix", "Salesforce", "Adobe", "Oracle",
  "Intel", "AMD", "Qualcomm", "Broadcom", "IBM", "Cisco",
  "Uber", "Airbnb", "Snowflake", "Palantir", "Databricks",
  "CrowdStrike", "Palo Alto Networks",

  // AI Companies
  "OpenAI", "Anthropic", "Mistral", "Cohere", "Stability AI",
  "Inflection AI", "xAI", "Safe Superintelligence", "Perplexity",
  "Cognition AI", "Thinking Machines Lab", "Groq", "Character.AI",
  "ElevenLabs", "Snorkel AI", "DataRobot", "Together AI", "Modular AI",
  "Reka AI", "Cerebras Systems", "SambaNova Systems", "Hugging Face",
  "Harvey", "Glean", "Writer", "LangChain", "Imbue", "Adept",
  "Typeface", "Hippocratic AI", "Reflection AI", "SandboxAQ",
  "Liquid AI", "World Labs", "Altana AI", "Skild AI",

  // Major Startups / Private
  "SpaceX", "Stripe", "Instacart", "Discord", "Figma",
  "Canva", "Plaid", "Rippling", "Anduril", "Scale AI",
  "Klarna", "Figure", "Fanatics", "Epic Games", "Chime", "Ramp",
  "Miro", "Gopuff", "Ripple", "OpenSea", "Grammarly", "Faire",
  "Brex", "JUUL Labs", "GoodLeap", "Deel", "Airtable", "Bolt",
  "Sierra", "Alchemy", "Bilt Rewards", "Colossal", "Gusto", "Talkdesk",
  "Notion", "Navan", "VAST Data", "Anysphere", "Tanium", "Niantic",
  "Flexport", "Automattic", "Carta", "Snyk", "Gong", "Wonder",
  "Automation Anywhere", "PsiQuantum", "Upgrade", "Benchling",
  "Grafana Labs", "Applied Intuition", "Commure", "Nuro",
  "Workato", "Vuori", "The Boring Company", "Postman", "FiveTran",
  "Shield AI", "NinjaOne", "Quince", "OneTrust", "Redwood Materials",
  "Abnormal Security", "Whatnot", "Cockroach Labs", "Icertis",
  "Coalition", "BetterUp", "Lyra Health", "Checkr", "Skims",
  "Helion Energy", "Socure", "Outreach", "Lightmatter",
  "Guild Education", "Arctic Wolf Networks", "Island", "OutSystems",
  "Zipline", "Relativity Space", "ThoughtSpot", "Globalization Partners",
  "dbt Labs", "Vanta", "Dataminr", "AlphaSense", "Saronic Technologies",
  "Impossible Foods", "Next Insurance", "Zapier", "ClickUp",
  "Farmers Business Network", "Aurora Solar", "Webflow", "Yuga Labs",
  "StockX", "Articulate", "Cohesity", "Dataiku", "GOAT", "Noom",
  "Papaya Global", "Harness", "o9 Solutions", "Relativity", "Whoop",
  "Course Hero", "SpotOn", "Cribl", "Tekion", "Highspot", "Handshake",
  "MoonPay", "Together AI", "Spring Health", "Vercel", "Thumbtack",
  "Cedar", "Replit", "Runway", "Decart", "Addepar", "Innovaccer",
  "Ironclad", "Distyl AI", "Retool", "Verkada", "HighRadius",
  "LayerZero Labs", "Filevine", "Crusoe", "Monad Labs", "Circle",
  "Forter", "Calendly", "ActiveCampaign", "Lucid Software",
  "Age of Learning", "Carbon Health", "LaunchDarkly", "Seismic",
  "TradingView", "Podium", "Rokt", "Via", "Anchorage Digital",
  "Lattice", "Flutterwave", "Cross River Bank", "Remote", "Sentry",
  "Kraken", "Physical Intelligence", "Abridge", "Illumio",
  "MasterClass", "Nextiva", "Sourcegraph", "Pendo", "Axonius",
  "JumpCloud", "Lambda Labs", "Claroty", "Varo Bank", "Sword Health",
  "Aura", "Sysdig", "SiFive", "Paxos", "Beta Technologies",
  "Project44", "Freenome", "Transcarent", "Motive", "Greenlight",
  "Story Protocol", "Algolia", "EliseAI", "Skydio", "Gympass",
  "Dialpad", "BloomReach", "Qualia", "Supabase", "Neo4j",
  "Eightfold", "Aledade", "A24 Films", "Kalshi", "Firefly Aerospace",
  "GrubMarket", "Clear Street", "Drata", "Mysten Labs",
  "Formlabs", "Calm", "Kaseya", "Druva", "AppsFlyer", "Redis",
  "Kajabi", "Iterable", "Lovable", "ClickHouse", "Everlaw",
  "Netlify", "Dremio", "Cloudinary", "Salsify",
  "Acorns", "Fever", "ZocDoc", "ID.me", "FullStory",
  "Kindbody", "BitGo", "Orca Security", "DailyPay",
  "DispatchHealth", "Pax8", "Front", "Uniswap",
  "Headway", "Wasabi", "Vercel", "Sendbird",

  // Banks & Finance
  "JPMorgan", "JP Morgan", "Goldman Sachs", "Morgan Stanley",
  "Bank of America", "Citigroup", "Citi", "Wells Fargo",
  "BlackRock", "Vanguard", "Charles Schwab", "Fidelity",
  "Berkshire Hathaway",

  // VC Firms (when filing)
  "Andreessen Horowitz", "a16z", "Sequoia Capital", "Sequoia",
  "Lightspeed", "Accel", "Benchmark", "Kleiner Perkins",
  "Tiger Global", "SoftBank",

  // Crypto & Web3
  "Coinbase", "Robinhood", "Digital Currency Group", "Chainalysis",
  "Fireblocks", "FalconX", "CertiK", "Gauntlet Networks", "Aptos",
  "BlockDaemon", "Phantom", "Magic Eden", "Zero Hash", "Worldcoin",
  "MobileCoin", "Offchain Labs", "Aleo", "Injective", "Polyhedra Network",

  // Fintech
  "Block", "Square", "PayPal", "Visa", "Mastercard",
  "Tipalti", "iCapital", "Attentive", "Pipe", "Mercury",
  "Capitolis", "DriveWealth", "Justworks", "Modern Treasury",
  "Sunbit", "Fundbox", "TaxBit",

  // Automotive & Space
  "Rivian", "Lucid", "Waymo", "Cruise", "Axiom Space",
  "Boom Supersonic", "Locus Robotics", "ABL Space Systems",

  // Pharma / Health
  "Pfizer", "Moderna", "Johnson & Johnson", "UnitedHealth",
  "Devoted Health", "Ro", "Cerebral", "Reify Health",
  "Color", "Omada Health", "Komodo Health", "Virta Health",
  "Eikon Therapeutics", "Orna Therapeutics", "Generate Biomedicines",
  "Cambrian BioPharma", "Mammoth Biosciences", "Formation Bio",
  "Xaira Therapeutics", "Orca Bio",

  // Other Major
  "Walmart", "Disney", "Boeing", "Lockheed Martin",
  "Exxon", "ExxonMobil", "Chevron", "Shell",
  "Patreon", "Substack", "Strava", "Liquid Death", "OLIPOP",
  "Savage X Fenty", "Glossier", "Athletic Greens",

  // Enterprise & DevTools
  "Netskope", "Cyera", "6Sense", "Clari", "Monte Carlo",
  "Cresta", "Sigma Computing", "Hightouch", "Tealium",
  "BigID", "Huntress", "Anaconda", "Temporal", "Linear",
  "Clay", "Gecko Robotics", "Weka", "Baseten",

  // Additional notable companies
  "Devoted Health", "Flock Safety", "Dutchie", "Indigo Ag",
  "Rec Room", "ChargeBee Technologies", "Starburst", "Sila",
  "HoneyBook", "Aven", "Uptake", "Newfront Insurance",
  "Current", "Inari", "CHAOS Industries", "Zeta",
  "Medable", "Jeeves", "FieldAI", "The Bot Company",
  "Avant", "Unqork", "ISN", "Hive", "Ethos",
  "MURAL", "Apeel Sciences", "Aviatrix", "Misfits Market",
  "Magic Leap", "VerbIT", "LTK", "Devo Technology",
  "ShiftKey", "Solugen", "MX", "Roofstock",
  "ConcertAI", "Material Bank", "CFGI", "Diamond Foundry",
  "Opentrons", "PAX", "Redesign Health", "Tessera Therapeutics",
  "Ascend Elements", "UPSIDE Foods", "Divergent 3D", "Immuta",
  "Pathos", "Unite Us", "CircleCI", "Dragos", "Reltio", "H2O.ai",
  "ZenBusiness", "Productboard", "Spotter", "Optimism",
  "Dexterity", "Incredible Health", "FloQast",
  "Apollo", "Extend", "Chapter", "Altruist", "ASAPP",
  "HomeLight", "ezCater", "Pave", "Icon", "Alloy",
  "Fal", "You.com", "OpenWeb", "Mu Sigma", "Jasper",
  "Cambridge Mobile Telematics", "Collective Health", "Zenoti",
  "Uplight", "Snapdocs", "Chipper Cash", "impact.com",
  "Pacaso", "Persona", "Andela", "Built", "CoinList", "Lusha",
  "Airbyte", "Veho", "Fabric", "Upside", "Mashgin",
  "Prometheus", "Arcadia", "VTS", "Placer.ai", "M1",
  "SonderMind", "Route", "Papa", "Envoy", "SparkCognition",
  "Symphony", "Kong", "Yotpo", "Stash", "Rad Power Bikes",
  "Clarify Health", "Phenom People", "GupShup", "Degreed",
  "VideoAmp", "Panther Labs", "Salt Security", "Nimble Rx",
  "Epirus", "Netradyne", "Signifyd", "Human Interest", "Lyten",
  "Flipboard", "Alzheon", "MasterControl", "24M Technology",
  "Zum", "HeartFlow", "Everly Health", "DistroKid", "Betterment",
  "Flock Freight", "YugaByte", "Lukka", "iTrustCapital",
  "Domestika", "CoinTracker", "Loadsmart", "Clipboard Health",
  "STORD", "Keyfactor", "Equashield", "Intercom",
  "Honor Technology", "Mythical Games", "Incode Technologies",
  "CaptivateIQ", "Talos", "airSlate", "ClassDojo", "Teamworks",
  "SeatGeek", "Lila Sciences", "InDrive", "Kallyope",
  "Zip", "Cart.com", "Nerdio", "Creatio", "Our Next Energy",
  "Oyster", "Qumulo", "Public", "Pilot", "Vectra Networks",
  "MindTickle", "Copado", "Gem", "AgentSync", "SeekOut",
  "BigPanda", "Nova Labs", "Viz.ai", "Unit", "Celestial AI",
  "Swiftly", "CloudBees", "DevRev", "Modern Health",
  "SOURCE Global", "Rebellion Defense", "Enable", "At-Bay",
  "Visby Medical", "Invoca", "Onebrief", "Rokid",
  "Thyme Care", "Flexe", "AppDirect", "Ivalua", "Sisense",
  "G2", "Caribou", "People.ai", "Karat", "Turing",
  "Beyond Identity", "Chief", "IntelyCare", "Teleport",
  "Imply Data", "Material Security", "CAIS", "Cirkul", "0x",
  "Instabase", "Density", "Mixpanel", "Branch", "Juniper Square",
  "Cyberhaven", "Meter", "Apex", "Enveda",
  "Ambience", "Zyphra", "Awardco", "Owner", "EvenUp",
  "BuildOps", "Nourish", "Assured", "Truveta", "Kiteworks",
  "Ayar Labs", "QuEra Computing", "Vestwell", "Speak",
  "Halcyon", "VectorBuilder", "The Row", "Cosm", "Minute Media",
  "Merkle Manufactory", "Semperis", "Electric Hydrogen",
  "MaintainX", "Avenue One", "Restaurant365", "KoBold Metals",
  "Gradiant", "Palmetto", "Prove Identity", "Atmosphere",
  "Flow", "Turntide Technologies", "Lookout", "Zebec",
  "Red Ventures", "C2FO", "Quizlet", "Zwift", "Alation",
  "Quantum Metric", "News Break", "Splashtop",
  "Standard AI", "Newsela", "Evidation", "Feedzai", "Cameo",
  "The Zebra", "Sift", "Capsule", "MOLOCO", "Mux",
  "Forte Labs", "Axtria", "Printful", "Shippo",
  "SmartAsset", "Morning Consult", "ShipBob", "Amperity",
  "Pantheon Systems", "Carson Group", "Bluecore", "Maven",
  "PicsArt", "Orchard", "Assembly", "PandaDoc",
  "Masterworks", "Chronosphere", "Solo.io", "Augury", "Vagaro",
  "Contrast Security", "Wrapbook", "PLACE", "Stytch", "Owkin",
  "Expel", "Lessen", "YipitData", "Anyscale", "ReliaQuest",
  "Nature's Fynd", "SnapLogic", "Cadence", "Rothy's", "Minio",
  "Esusu", "Watershed", "CHEQ", "Timescale", "BlueVoyant",
  "Vendr", "Glia", "CommerceIQ", "Tarana Wireless", "FLASH",
  "Electric", "BostonGene", "Genies", "NexHealth",
  "CareBridge", "JupiterOne",

  // BlockFi (notable even post-bankruptcy)
  "BlockFi",

  // Gaming
  "Rec Room", "Niantic", "1047 Games", "thatgamecompany",
  "Mythical Games",

  // E-commerce & Consumer
  "Glossier", "GOAT", "StockX", "Weee!", "Houzz",
  "Liquid Death", "OLIPOP", "Harry's", "Misfits Market",
  "Kendra Scott", "Pat McGrath Labs",

  // Misc tracked
  "Black Unicorn Factory", "Devoted Health", "Caris",
  "Netskope", "Flock Safety", "Cerebral", "Reify Health",
  "OpenEvidence", "Chainguard", "Vultr", "Judi Health",
  "Pharmapacks", "Seekr", "Abba Platforms", "Labs",
  "Nutrabolt", "Tradeshift", "Plume", "Peregrine",
  "Jetti Resources", "Side", "Fetch", "insitro", "Carbon",
  "BitSight Technologies", "Trumid", "Workrise",
  "Outschool", "Inxeption", "JUST Egg", "Somatus",
  "Uniphore", "BlockFi", "Globality", "REEF Technology",
  "TechStyle Fashion Group", "Tresata", "Away",
  "Stash", "Clubhouse", "Dutchie",
];

// Pre-compute lowercase set for fast lookups
const majorCompaniesLower = new Set(MAJOR_COMPANIES.map((c) => c.toLowerCase()));

/**
 * Load watchlist company names from Supabase.
 */
async function getWatchlistCompanies(): Promise<Set<string>> {
  const companies = new Set<string>();
  if (!isSupabaseConfigured() || !supabase) return companies;

  try {
    const { data } = await supabase
      .from("watchlist")
      .select("name")
      .eq("type", "company");

    if (data) {
      for (const item of data) {
        companies.add((item.name as string).toLowerCase());
      }
    }
  } catch (error) {
    console.error("[SEC Filter] Failed to load watchlist:", error);
  }

  return companies;
}

/**
 * Load company names mentioned in recent articles (last 7 days).
 * Scans key_entities from the summaries table.
 */
async function getRecentArticleCompanies(): Promise<Set<string>> {
  const companies = new Set<string>();
  if (!isSupabaseConfigured() || !supabase) return companies;

  try {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const { data } = await supabase
      .from("summaries")
      .select("key_entities, generated_at")
      .gte("generated_at", since.toISOString())
      .not("key_entities", "is", null);

    if (data) {
      for (const row of data) {
        const entities = row.key_entities as Array<{ name: string; type: string }>;
        if (Array.isArray(entities)) {
          for (const entity of entities) {
            if (entity.type === "company") {
              companies.add(entity.name.toLowerCase());
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("[SEC Filter] Failed to load recent companies:", error);
  }

  return companies;
}

/**
 * Get all relevant company names from the 3 sources:
 * 1. Watchlist (Supabase)
 * 2. Recent article entities (7-day)
 * 3. Major companies list (hardcoded)
 */
export async function getRelevantCompanies(): Promise<Set<string>> {
  const [watchlist, recentCompanies] = await Promise.all([
    getWatchlistCompanies(),
    getRecentArticleCompanies(),
  ]);

  // Combine all sources into one set
  const relevant = new Set<string>([
    ...watchlist,
    ...recentCompanies,
    ...majorCompaniesLower,
  ]);

  return relevant;
}

/**
 * Extract company name from EDGAR title format.
 * EDGAR titles look like: "8-K - Apple Inc (0000320193) (Filer)"
 * Returns the company name portion, or null if parsing fails.
 */
export function extractCompanyFromEdgarTitle(title: string): string | null {
  // Pattern: "FORM_TYPE - COMPANY_NAME (CIK) (Filer)"
  const match = title.match(/^[\w-]+\s*-\s*(.+?)(?:\s*\(\d+\)|\s*\(Filer\))/i);
  if (match) {
    return match[1].trim().replace(/\s*\(Filer\)$/i, "").trim();
  }

  // Fallback: try to extract everything after the dash
  const dashMatch = title.match(/^[\w-]+\s*-\s*(.+)/);
  if (dashMatch) {
    return dashMatch[1].trim();
  }

  return null;
}

/**
 * Check if a filing is relevant based on company name.
 */
export function isRelevantFiling(
  title: string,
  companyName: string | null,
  relevantCompanies: Set<string>
): boolean {
  // Check the extracted company name
  if (companyName) {
    const lower = companyName.toLowerCase();
    // Exact match
    if (relevantCompanies.has(lower)) return true;
    // Partial match: check if any relevant company is contained in the name
    for (const relevant of relevantCompanies) {
      if (lower.includes(relevant) || relevant.includes(lower)) return true;
    }
  }

  // Check if the title contains any relevant company name
  const titleLower = title.toLowerCase();
  for (const company of relevantCompanies) {
    if (company.length >= 3 && titleLower.includes(company)) return true;
  }

  return false;
}

/**
 * Filter SEC filings to only relevant companies.
 * Non-SEC articles pass through unchanged.
 */
export async function filterSECFilings(
  articles: RawArticle[]
): Promise<RawArticle[]> {
  // Split into SEC and non-SEC
  const secArticles = articles.filter((a) => a.sourceId.startsWith("sec-edgar-"));
  const nonSecArticles = articles.filter((a) => !a.sourceId.startsWith("sec-edgar-"));

  if (secArticles.length === 0) {
    return articles;
  }

  // Load relevant companies
  const relevantCompanies = await getRelevantCompanies();

  // Filter SEC articles
  const filteredSec = secArticles.filter((article) => {
    const companyName = extractCompanyFromEdgarTitle(article.title);
    return isRelevantFiling(article.title, companyName, relevantCompanies);
  });

  console.log(
    `[SEC Filter] ${secArticles.length} SEC filings → ${filteredSec.length} relevant (${secArticles.length - filteredSec.length} discarded)`
  );

  return [...nonSecArticles, ...filteredSec];
}
