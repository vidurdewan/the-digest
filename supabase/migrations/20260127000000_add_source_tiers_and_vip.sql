-- ============================================================
-- Migration: Add source tiering + VIP newsletter columns
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Add source_tier to articles (1=Edge, 2=Quality, 3=Mainstream)
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS source_tier INTEGER DEFAULT 3
  CHECK (source_tier IN (1, 2, 3));

CREATE INDEX IF NOT EXISTS idx_articles_source_tier ON articles (source_tier);

-- 2. Add source_tier and is_vip to newsletters
ALTER TABLE newsletters
  ADD COLUMN IF NOT EXISTS source_tier INTEGER DEFAULT 3
  CHECK (source_tier IN (1, 2, 3));

ALTER TABLE newsletters
  ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_newsletters_source_tier ON newsletters (source_tier);
CREATE INDEX IF NOT EXISTS idx_newsletters_is_vip ON newsletters (is_vip) WHERE is_vip = TRUE;

-- 3. Add vip_newsletters and last_newsletter_fetch to settings
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS vip_newsletters JSONB DEFAULT '["Stratechery"]';

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS last_newsletter_fetch TIMESTAMPTZ;

-- 4. Daily briefs cache table (used by /api/todays-brief)
CREATE TABLE IF NOT EXISTS daily_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_key TEXT UNIQUE NOT NULL,
  brief TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for daily_briefs (match existing pattern)
ALTER TABLE daily_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON daily_briefs FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Done! Verify with:
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'articles' AND column_name = 'source_tier';
-- ============================================================
