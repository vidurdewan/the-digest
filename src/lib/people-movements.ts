import type { Article, Summary, Entity } from "@/types";

/**
 * Represents a detected executive movement.
 */
export interface ExecutiveMove {
  personName: string;
  fromCompany?: string;
  fromRole?: string;
  toCompany?: string;
  toRole?: string;
  moveType: "hire" | "departure" | "promotion" | "board-appointment";
  articleId: string;
  articleTitle: string;
  source: string;
  publishedAt: string;
  confidence: "high" | "medium" | "low";
}

// Role-related keywords to detect executive movements
const ROLE_KEYWORDS = [
  "ceo",
  "cto",
  "cfo",
  "coo",
  "cmo",
  "cpo",
  "ciso",
  "chief",
  "president",
  "vp",
  "vice president",
  "svp",
  "evp",
  "managing director",
  "managing partner",
  "partner",
  "general partner",
  "director",
  "head of",
  "founder",
  "co-founder",
  "board",
];

const MOVE_PATTERNS = {
  hire: [
    /(\w[\w\s]+?)\s+(?:has been|was)\s+(?:hired|appointed|named|tapped)\s+(?:as|to be)\s+(\w[\w\s]+?)\s+(?:at|of|for)\s+(\w[\w\s]+)/i,
    /(\w[\w\s]+?)\s+joins\s+(\w[\w\s]+?)\s+as\s+(\w[\w\s]+)/i,
    /(\w[\w\s]+?)\s+(?:has joined|joined)\s+(\w[\w\s]+?)\s+as\s+(\w[\w\s]+)/i,
  ],
  departure: [
    /(\w[\w\s]+?),?\s+(?:who served as|formerly)\s+(\w[\w\s]+?)\s+(?:at|of)\s+(\w[\w\s]+?),?\s+(?:has left|left|departed|stepped down|resigned)/i,
    /(\w[\w\s]+?)\s+(?:has left|left|departed|is leaving|steps down from|resigns from)\s+(?:the\s+)?(?:(\w[\w\s]+?)\s+)?(?:role\s+)?(?:at|of)\s+(\w[\w\s]+)/i,
  ],
  promotion: [
    /(\w[\w\s]+?)\s+(?:has been|was)\s+promoted\s+to\s+(\w[\w\s]+?)\s+(?:at|of)\s+(\w[\w\s]+)/i,
    /(\w[\w\s]+?)\s+promotes\s+(\w[\w\s]+?)\s+to\s+(\w[\w\s]+)/i,
  ],
  boardAppointment: [
    /(\w[\w\s]+?)\s+(?:will join|joins|has joined)\s+(\w[\w\s]+?)(?:'s)?\s+board/i,
  ],
};

/**
 * Detect executive movements from an article using NLP heuristics.
 * Looks at title, content, and entity data.
 */
export function detectMovements(
  article: Article & { summary?: Summary }
): ExecutiveMove[] {
  const moves: ExecutiveMove[] = [];
  const text = [
    article.title,
    article.content || "",
    article.summary?.theNews || "",
  ].join(" ");
  const lowerText = text.toLowerCase();

  // Quick check: does this article mention any role keywords?
  const hasRoleKeyword = ROLE_KEYWORDS.some((kw) => lowerText.includes(kw));
  const hasMoveVerb = [
    "join",
    "left",
    "depart",
    "hire",
    "appoint",
    "promote",
    "named",
    "tapped",
    "resign",
    "steps down",
    "step down",
  ].some((v) => lowerText.includes(v));

  if (!hasRoleKeyword && !hasMoveVerb) return moves;

  // Entity-based detection (higher confidence)
  const entities = article.summary?.keyEntities || [];
  const persons = entities.filter((e) => e.type === "person");
  const companies = entities.filter(
    (e) => e.type === "company" || e.type === "fund"
  );

  if (persons.length > 0 && companies.length > 0) {
    // Check for departure/hire patterns
    for (const person of persons) {
      const move = detectMoveForPerson(
        person,
        companies,
        text,
        article
      );
      if (move) moves.push(move);
    }
  }

  // Pattern-based detection (lower confidence fallback)
  if (moves.length === 0) {
    // Try hire patterns
    for (const pattern of MOVE_PATTERNS.hire) {
      const match = text.match(pattern);
      if (match) {
        moves.push({
          personName: match[1].trim(),
          toCompany: match[2]?.trim(),
          toRole: match[3]?.trim(),
          moveType: "hire",
          articleId: article.id,
          articleTitle: article.title,
          source: article.source,
          publishedAt: article.publishedAt,
          confidence: "low",
        });
        break;
      }
    }

    // Try departure patterns
    for (const pattern of MOVE_PATTERNS.departure) {
      const match = text.match(pattern);
      if (match) {
        moves.push({
          personName: match[1].trim(),
          fromRole: match[2]?.trim(),
          fromCompany: match[3]?.trim(),
          moveType: "departure",
          articleId: article.id,
          articleTitle: article.title,
          source: article.source,
          publishedAt: article.publishedAt,
          confidence: "low",
        });
        break;
      }
    }

    // Try board appointment patterns
    for (const pattern of MOVE_PATTERNS.boardAppointment) {
      const match = text.match(pattern);
      if (match) {
        moves.push({
          personName: match[1].trim(),
          toCompany: match[2]?.trim(),
          toRole: "Board Member",
          moveType: "board-appointment",
          articleId: article.id,
          articleTitle: article.title,
          source: article.source,
          publishedAt: article.publishedAt,
          confidence: "low",
        });
        break;
      }
    }
  }

  return moves;
}

function detectMoveForPerson(
  person: Entity,
  companies: Entity[],
  text: string,
  article: Article & { summary?: Summary }
): ExecutiveMove | null {
  const lowerText = text.toLowerCase();
  const personLower = person.name.toLowerCase();

  // Check for departure keywords near the person's name
  const personIdx = lowerText.indexOf(personLower);
  if (personIdx === -1) return null;

  const context = lowerText.slice(
    Math.max(0, personIdx - 100),
    personIdx + person.name.length + 200
  );

  const isDeparture =
    context.includes("left") ||
    context.includes("depart") ||
    context.includes("resign") ||
    context.includes("step down") ||
    context.includes("former");

  const isHire =
    context.includes("join") ||
    context.includes("appointed") ||
    context.includes("hired") ||
    context.includes("named") ||
    context.includes("becomes");

  const isPromotion =
    context.includes("promoted") || context.includes("promotes");

  const isBoard =
    context.includes("board") &&
    (context.includes("join") || context.includes("appointed"));

  if (!isDeparture && !isHire && !isPromotion && !isBoard) return null;

  // Determine from/to companies
  const roleMatch = context.match(
    /(?:as|role of|position of)\s+([\w\s]+?)(?:\s+at|\s+of|\s+for|,|\.)/i
  );
  const role = roleMatch ? roleMatch[1].trim() : undefined;

  const moveType = isBoard
    ? "board-appointment"
    : isPromotion
      ? "promotion"
      : isDeparture && isHire
        ? "hire"
        : isDeparture
          ? "departure"
          : "hire";

  return {
    personName: person.name,
    fromCompany:
      isDeparture && companies.length > 0 ? companies[0].name : undefined,
    fromRole: isDeparture ? role : undefined,
    toCompany: isHire && companies.length > 0
      ? (companies.length > 1 ? companies[1].name : companies[0].name)
      : isBoard && companies.length > 0
        ? companies[0].name
        : undefined,
    toRole: isHire || isPromotion || isBoard ? role : undefined,
    moveType,
    articleId: article.id,
    articleTitle: article.title,
    source: article.source,
    publishedAt: article.publishedAt,
    confidence: "medium",
  };
}

/**
 * Detect movements across all articles and deduplicate.
 */
export function detectAllMovements(
  articles: (Article & { summary?: Summary })[]
): ExecutiveMove[] {
  const allMoves: ExecutiveMove[] = [];
  const seen = new Set<string>();

  // Prioritize articles in the exec-movements topic
  const sorted = [...articles].sort((a, b) => {
    if (a.topic === "executive-movements" && b.topic !== "executive-movements")
      return -1;
    if (b.topic === "executive-movements" && a.topic !== "executive-movements")
      return 1;
    return (
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  });

  for (const article of sorted) {
    const moves = detectMovements(article);
    for (const move of moves) {
      const key = `${move.personName.toLowerCase()}-${move.moveType}`;
      if (!seen.has(key)) {
        seen.add(key);
        allMoves.push(move);
      }
    }
  }

  return allMoves;
}

/**
 * Aggregate articles by company/entity for Company Intelligence view.
 */
export interface CompanyIntelligence {
  name: string;
  type: "company" | "fund";
  articleCount: number;
  articles: (Article & { summary?: Summary })[];
  recentMoves: ExecutiveMove[];
  topics: string[];
  lastMentioned: string;
}

export function aggregateByCompany(
  articles: (Article & { summary?: Summary })[]
): CompanyIntelligence[] {
  const companyMap = new Map<
    string,
    {
      name: string;
      type: "company" | "fund";
      articles: (Article & { summary?: Summary })[];
    }
  >();

  for (const article of articles) {
    const entities = article.summary?.keyEntities || [];
    for (const entity of entities) {
      if (entity.type === "company" || entity.type === "fund") {
        const key = entity.name.toLowerCase();
        if (!companyMap.has(key)) {
          companyMap.set(key, {
            name: entity.name,
            type: entity.type,
            articles: [],
          });
        }
        companyMap.get(key)!.articles.push(article);
      }
    }

    // Also check title/source for company mentions from watchlist
    if (article.watchlistMatches.length > 0) {
      for (const match of article.watchlistMatches) {
        const key = match.toLowerCase();
        if (!companyMap.has(key)) {
          companyMap.set(key, {
            name: match,
            type: "company",
            articles: [],
          });
        }
        const existing = companyMap.get(key)!;
        if (!existing.articles.some((a) => a.id === article.id)) {
          existing.articles.push(article);
        }
      }
    }
  }

  const allMoves = detectAllMovements(articles);

  return Array.from(companyMap.values())
    .map((company) => {
      const topics = [
        ...new Set(company.articles.map((a) => a.topic)),
      ];
      const sortedArticles = company.articles.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() -
          new Date(a.publishedAt).getTime()
      );

      const companyMoves = allMoves.filter(
        (m) =>
          m.fromCompany?.toLowerCase() === company.name.toLowerCase() ||
          m.toCompany?.toLowerCase() === company.name.toLowerCase()
      );

      return {
        name: company.name,
        type: company.type,
        articleCount: company.articles.length,
        articles: sortedArticles,
        recentMoves: companyMoves,
        topics,
        lastMentioned:
          sortedArticles[0]?.publishedAt || new Date().toISOString(),
      };
    })
    .sort((a, b) => b.articleCount - a.articleCount);
}
