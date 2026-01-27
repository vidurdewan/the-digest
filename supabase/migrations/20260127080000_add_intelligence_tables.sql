-- Migration: Create intelligence tables that were missing from hosted Supabase
-- These tables are needed for PostgREST FK joins on article_intelligence

-- 12. story_threads — Groups developing stories across time
CREATE TABLE IF NOT EXISTS story_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  article_count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'stale')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. article_intelligence — Pre-computed AI intelligence per article
CREATE TABLE IF NOT EXISTS article_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE UNIQUE,
  significance_score INTEGER CHECK (significance_score BETWEEN 1 AND 10),
  story_type TEXT CHECK (story_type IN ('breaking', 'developing', 'analysis', 'opinion', 'feature', 'update')),
  connects_to JSONB DEFAULT '[]',
  story_thread_id UUID REFERENCES story_threads(id) ON DELETE SET NULL,
  watch_for_next TEXT,
  is_surprise_candidate BOOLEAN DEFAULT FALSE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_intel_article ON article_intelligence (article_id);
CREATE INDEX IF NOT EXISTS idx_article_intel_thread ON article_intelligence (story_thread_id);
CREATE INDEX IF NOT EXISTS idx_article_intel_significance ON article_intelligence (significance_score DESC);

-- 14. article_reactions — Quick user feedback
CREATE TABLE IF NOT EXISTS article_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('already_knew', 'useful', 'surprising', 'bad_connection', 'not_important')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_reactions_article ON article_reactions (article_id);

-- 15. reminders — "Remind Me" follow-ups
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  note TEXT,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders (remind_at) WHERE NOT is_dismissed;

-- 16. reading_progress — Daily reading progress tracking
CREATE TABLE IF NOT EXISTS reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  total_priority_items INTEGER DEFAULT 0,
  items_read INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. weekly_synthesis — Sunday auto-generated weekly summary
CREATE TABLE IF NOT EXISTS weekly_synthesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL UNIQUE,
  week_end DATE NOT NULL,
  synthesis TEXT NOT NULL,
  threads JSONB DEFAULT '[]',
  patterns JSONB DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for new tables
ALTER TABLE story_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_synthesis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON story_threads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON article_intelligence FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON article_reactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON reminders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON reading_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON weekly_synthesis FOR ALL USING (true) WITH CHECK (true);

-- Force PostgREST to reload schema cache so FK joins work immediately
NOTIFY pgrst, 'reload schema';
