import type { Article, Summary, TopicCategory, InterestLevel } from "@/types";

type TopicPreferences = Record<TopicCategory, InterestLevel>;

// Weights for the ranking score
const INTEREST_WEIGHTS: Record<InterestLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
  hidden: 0,
};

/**
 * Score and rank articles for the Priority Feed.
 *
 * Factors:
 * 1. Topic preference (high/medium/low/hidden)
 * 2. Watchlist matches (articles mentioning watched entities rank higher)
 * 3. Recency (newer articles rank higher)
 * 4. Engagement-based topic boosting (topics the user engages with more)
 * 5. Has summary (articles with summaries are more useful)
 */
export function rankArticles(
  articles: (Article & { summary?: Summary })[],
  options: {
    topicPreferences?: TopicPreferences;
    topicEngagementScores?: Record<string, number>;
  } = {}
): (Article & { summary?: Summary })[] {
  const { topicPreferences, topicEngagementScores } = options;

  // Calculate max engagement score for normalization
  const maxEngagement = topicEngagementScores
    ? Math.max(...Object.values(topicEngagementScores), 1)
    : 1;

  const scored = articles.map((article) => {
    let score = 0;

    // 1. Topic preference (0-3 points)
    if (topicPreferences) {
      const level = topicPreferences[article.topic];
      if (level === "hidden") {
        return { article, score: -1 }; // Filter out hidden topics
      }
      score += INTEREST_WEIGHTS[level || "medium"];
    } else {
      score += 2; // Default medium
    }

    // 2. Watchlist matches (0-5 points)
    if (article.watchlistMatches.length > 0) {
      score += Math.min(article.watchlistMatches.length * 2, 5);
    }

    // 3. Recency (0-3 points, based on age)
    const ageHours =
      (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60);
    if (ageHours < 3) {
      score += 3;
    } else if (ageHours < 12) {
      score += 2;
    } else if (ageHours < 24) {
      score += 1.5;
    } else if (ageHours < 72) {
      score += 0.5;
    }

    // 4. Engagement-based topic boost (0-2 points)
    if (topicEngagementScores) {
      const topicScore = topicEngagementScores[article.topic] || 0;
      score += (topicScore / maxEngagement) * 2;
    }

    // 5. Has summary (0.5 points)
    if (article.summary?.theNews) {
      score += 0.5;
    }

    // 6. Unread boost (0.5 points)
    if (!article.isRead) {
      score += 0.5;
    }

    return { article, score };
  });

  // Filter out hidden, sort by score descending
  return scored
    .filter((s) => s.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.article);
}

/**
 * Filter articles by topic preferences.
 * "hidden" topics are excluded entirely.
 */
export function filterByPreferences(
  articles: (Article & { summary?: Summary })[],
  preferences: TopicPreferences
): (Article & { summary?: Summary })[] {
  return articles.filter((a) => preferences[a.topic] !== "hidden");
}
