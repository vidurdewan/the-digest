-- ============================================================
-- Migration: Add ranking_score column to articles
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Add ranking_score to articles (0-100 composite score)
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS ranking_score NUMERIC(6, 2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_articles_ranking_score ON articles (ranking_score DESC);

-- Composite index for top stories query (today's highest ranked)
CREATE INDEX IF NOT EXISTS idx_articles_published_ranking
  ON articles (published_at DESC, ranking_score DESC);

-- ============================================================
-- Done! Verify with:
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'articles' AND column_name = 'ranking_score';
-- ============================================================
