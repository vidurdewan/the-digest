import type { Article, Summary, ArticleIntelligence, ArticleWithIntelligence, TopicCategory } from "@/types";

type ArticleWithMeta = Article & { summary?: Summary; intelligence?: ArticleIntelligence };

/**
 * Select diverse top stories for the hero + grid section.
 * Ensures source and topic diversity:
 *   - Max 2 articles from the same publication
 *   - At least 3 different topic categories across the selected articles
 * Falls back to rank order if constraints can't be fully met.
 */
export function selectDiverseTopStories(
  rankedArticles: ArticleWithMeta[],
  count = 5
): { topStories: ArticleWithMeta[]; remaining: ArticleWithMeta[] } {
  if (rankedArticles.length <= count) {
    return { topStories: rankedArticles, remaining: [] };
  }

  const selected: ArticleWithMeta[] = [];
  const usedIndices = new Set<number>();
  const sourceCounts: Record<string, number> = {};
  const topicsSeen = new Set<TopicCategory>();

  // Always pick #1 ranked article as hero
  selected.push(rankedArticles[0]);
  usedIndices.add(0);
  sourceCounts[rankedArticles[0].source] = 1;
  topicsSeen.add(rankedArticles[0].topic);

  // Greedily pick remaining articles respecting diversity constraints
  for (let pick = 1; pick < count; pick++) {
    let bestIdx = -1;

    for (let i = 1; i < rankedArticles.length; i++) {
      if (usedIndices.has(i)) continue;

      const candidate = rankedArticles[i];
      const sourceCount = sourceCounts[candidate.source] || 0;

      // Hard constraint: max 2 from same source
      if (sourceCount >= 2) continue;

      // Prefer candidates that add a new topic (soft constraint)
      // We'll just pick the first valid one — they're already ranked
      bestIdx = i;

      // If this candidate adds a new topic and we need more diversity, prefer it
      if (!topicsSeen.has(candidate.topic)) {
        break; // This is ideal — new topic + highest ranked valid
      }
    }

    // Fallback: if no valid candidate found, just take the next unused
    if (bestIdx === -1) {
      for (let i = 1; i < rankedArticles.length; i++) {
        if (!usedIndices.has(i)) {
          bestIdx = i;
          break;
        }
      }
    }

    if (bestIdx === -1) break;

    const chosen = rankedArticles[bestIdx];
    selected.push(chosen);
    usedIndices.add(bestIdx);
    sourceCounts[chosen.source] = (sourceCounts[chosen.source] || 0) + 1;
    topicsSeen.add(chosen.topic);
  }

  // Check if we have at least 3 topics; if not, try to swap in a different-topic article
  if (topicsSeen.size < 3 && selected.length >= count) {
    for (let i = selected.length - 1; i >= 1; i--) {
      // Try to replace the last selected that shares a topic with another
      const topicsWithout = new Set(selected.filter((_, idx) => idx !== i).map((a) => a.topic));
      if (topicsWithout.size >= topicsSeen.size) {
        // This article's topic is already covered by others — try swapping
        for (let j = 0; j < rankedArticles.length; j++) {
          if (usedIndices.has(j)) continue;
          const candidate = rankedArticles[j];
          if (!topicsWithout.has(candidate.topic)) {
            const sourceCount = selected.filter((a, idx) => idx !== i && a.source === candidate.source).length;
            if (sourceCount < 2) {
              selected[i] = candidate;
              topicsSeen.add(candidate.topic);
              break;
            }
          }
        }
        if (topicsSeen.size >= 3) break;
      }
    }
  }

  const selectedIds = new Set(selected.map((a) => a.id));
  const remaining = rankedArticles.filter((a) => !selectedIds.has(a.id));

  return { topStories: selected, remaining };
}

/**
 * Group articles by topic category, maintaining rank order within each group.
 * Returns groups ordered by the number of articles (largest first).
 */
export function groupByTopic(
  articles: ArticleWithMeta[]
): { topic: TopicCategory; articles: ArticleWithMeta[] }[] {
  const groups: Record<string, ArticleWithMeta[]> = {};

  for (const article of articles) {
    if (!groups[article.topic]) {
      groups[article.topic] = [];
    }
    groups[article.topic].push(article);
  }

  return Object.entries(groups)
    .map(([topic, arts]) => ({ topic: topic as TopicCategory, articles: arts }))
    .sort((a, b) => b.articles.length - a.articles.length);
}
