-- Rollback: 20260127010000_add_ranking_score.sql

DROP INDEX IF EXISTS idx_articles_published_ranking;
DROP INDEX IF EXISTS idx_articles_ranking_score;
ALTER TABLE articles DROP COLUMN IF EXISTS ranking_score;
