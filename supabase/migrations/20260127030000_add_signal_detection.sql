-- Migration: Add early signal detection tables
-- entity_history tracks per-article entity mentions for signal analysis
-- article_signals stores detected signals (badges) per article

-- ============================================================
-- 18. entity_history — Tracks entity mentions across all articles
-- ============================================================
CREATE TABLE IF NOT EXISTS entity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'company'
    CHECK (entity_type IN ('company', 'person', 'fund', 'keyword', 'organization')),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  source_tier INTEGER NOT NULL DEFAULT 3 CHECK (source_tier IN (1, 2, 3)),
  source_name TEXT,
  sentiment_label TEXT DEFAULT 'neutral'
    CHECK (sentiment_label IN ('positive', 'negative', 'neutral')),
  sentiment_score NUMERIC(4, 2) DEFAULT 0,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Composite index for "all mentions of entity X in time range"
CREATE INDEX IF NOT EXISTS idx_entity_history_name_time
  ON entity_history (entity_name, detected_at DESC);

-- Index for "what entities does article Y mention?"
CREATE INDEX IF NOT EXISTS idx_entity_history_article
  ON entity_history (article_id);

-- Index for convergence queries: tier-1 mentions in last 48h
CREATE INDEX IF NOT EXISTS idx_entity_history_tier_time
  ON entity_history (source_tier, detected_at DESC);

-- Prevent duplicate (same article, same entity) rows
CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_history_unique_mention
  ON entity_history (article_id, entity_name);

-- ============================================================
-- 19. article_signals — Detected early signals per article
-- ============================================================
CREATE TABLE IF NOT EXISTS article_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL
    CHECK (signal_type IN (
      'first_mention',
      'tier1_before_mainstream',
      'convergence',
      'unusual_activity',
      'sentiment_shift'
    )),
  signal_label TEXT NOT NULL,
  entity_name TEXT,
  confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.5
    CHECK (confidence BETWEEN 0 AND 1),
  metadata JSONB DEFAULT '{}',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, signal_type, entity_name)
);

CREATE INDEX IF NOT EXISTS idx_article_signals_article
  ON article_signals (article_id);

CREATE INDEX IF NOT EXISTS idx_article_signals_type
  ON article_signals (signal_type, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_article_signals_entity
  ON article_signals (entity_name, detected_at DESC)
  WHERE entity_name IS NOT NULL;

-- RLS
ALTER TABLE entity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON entity_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON article_signals FOR ALL USING (true) WITH CHECK (true);
