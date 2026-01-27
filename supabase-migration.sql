-- ============================================================
-- The Digest — Supabase Database Migration
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. users (health check table)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert a default user for health checks
INSERT INTO users (id) VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 2. articles
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  url TEXT,
  author TEXT,
  content TEXT,
  image_url TEXT,
  published_at TIMESTAMPTZ,
  topic TEXT,
  reading_time_minutes INTEGER,
  content_hash TEXT UNIQUE,
  source_tier INTEGER DEFAULT 3 CHECK (source_tier IN (1, 2, 3)),
  ranking_score NUMERIC(6, 2) DEFAULT 0,
  document_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_topic ON articles (topic);
CREATE INDEX IF NOT EXISTS idx_articles_content_hash ON articles (content_hash);
CREATE INDEX IF NOT EXISTS idx_articles_source_tier ON articles (source_tier);
CREATE INDEX IF NOT EXISTS idx_articles_ranking_score ON articles (ranking_score DESC);
CREATE INDEX IF NOT EXISTS idx_articles_published_ranking ON articles (published_at DESC, ranking_score DESC);
CREATE INDEX IF NOT EXISTS idx_articles_document_type ON articles (document_type) WHERE document_type IS NOT NULL;

-- 3. summaries
CREATE TABLE IF NOT EXISTS summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID UNIQUE REFERENCES articles(id) ON DELETE CASCADE,
  brief TEXT,
  the_news TEXT,
  why_it_matters TEXT,
  the_context TEXT,
  key_entities JSONB DEFAULT '[]',
  deciphering JSONB,
  tokens_used INTEGER DEFAULT 0,
  model_used TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_summaries_article_id ON summaries (article_id);

-- 4. newsletters
CREATE TABLE IF NOT EXISTS newsletters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gmail_message_id TEXT UNIQUE,
  publication TEXT,
  subject TEXT,
  sender_email TEXT,
  content TEXT,
  received_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT FALSE,
  is_vip BOOLEAN DEFAULT FALSE,
  source_tier INTEGER DEFAULT 3 CHECK (source_tier IN (1, 2, 3)),
  summary_the_news TEXT,
  summary_why_it_matters TEXT,
  summary_the_context TEXT,
  summary_so_what TEXT,
  summary_watch_next TEXT,
  summary_recruiter_relevance TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletters_received_at ON newsletters (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletters_gmail_id ON newsletters (gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_newsletters_source_tier ON newsletters (source_tier);
CREATE INDEX IF NOT EXISTS idx_newsletters_is_vip ON newsletters (is_vip) WHERE is_vip = TRUE;

-- 5. watchlist
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'company',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watchlist_created_at ON watchlist (created_at DESC);

-- 6. settings
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_preferences JSONB DEFAULT '{}',
  vip_newsletters JSONB DEFAULT '["Stratechery","Matt Levine","Money Stuff","The Diff","Eric Newcomer","Newcomer"]',
  last_newsletter_fetch TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings row
INSERT INTO settings (id, topic_preferences) VALUES ('00000000-0000-0000-0000-000000000001', '{}')
ON CONFLICT (id) DO NOTHING;

-- 7. engagement
CREATE TABLE IF NOT EXISTS engagement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_article_id ON engagement (article_id);
CREATE INDEX IF NOT EXISTS idx_engagement_created_at ON engagement (created_at DESC);

-- 8. gmail_tokens
CREATE TABLE IF NOT EXISTS gmail_tokens (
  id TEXT PRIMARY KEY DEFAULT 'default',
  access_token TEXT,
  refresh_token TEXT,
  expiry_date BIGINT,
  scope TEXT,
  token_type TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. api_usage
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE UNIQUE NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_cents NUMERIC(10, 4) DEFAULT 0,
  call_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage (date);

-- 10. sources
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url TEXT,
  type TEXT,
  topic TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sources_name ON sources (name);

-- 11. annotations
CREATE TABLE IF NOT EXISTS annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_annotations_article_id ON annotations (article_id);
CREATE INDEX IF NOT EXISTS idx_annotations_created_at ON annotations (created_at DESC);

-- ============================================================
-- Row Level Security (RLS) - Disable for now since we're using
-- anon key without auth. Enable when adding user auth later.
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- Allow anon access to all tables (single-user app)
CREATE POLICY "Allow all access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON articles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON summaries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON newsletters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON watchlist FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON engagement FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON gmail_tokens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON api_usage FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON annotations FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE daily_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON daily_briefs FOR ALL USING (true) WITH CHECK (true);

-- 11b. daily_briefs — Cached daily narrative briefs
CREATE TABLE IF NOT EXISTS daily_briefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date_key TEXT UNIQUE NOT NULL,
  brief TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Intelligence Redesign — New Tables
-- ============================================================

-- 12. story_threads — Groups developing stories across time
CREATE TABLE IF NOT EXISTS story_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('already_knew', 'useful', 'surprising', 'bad_connection', 'not_important')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_reactions_article ON article_reactions (article_id);

-- 15. reminders — "Remind Me" follow-ups
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  note TEXT,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders (remind_at) WHERE NOT is_dismissed;

-- 16. reading_progress — Daily reading progress tracking
CREATE TABLE IF NOT EXISTS reading_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  total_priority_items INTEGER DEFAULT 0,
  items_read INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. weekly_synthesis — Sunday auto-generated weekly summary
CREATE TABLE IF NOT EXISTS weekly_synthesis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ============================================================
-- Signal Detection — New Tables
-- ============================================================

-- 18. entity_history — Tracks entity mentions across all articles
CREATE TABLE IF NOT EXISTS entity_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE INDEX IF NOT EXISTS idx_entity_history_name_time ON entity_history (entity_name, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_entity_history_article ON entity_history (article_id);
CREATE INDEX IF NOT EXISTS idx_entity_history_tier_time ON entity_history (source_tier, detected_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_history_unique_mention ON entity_history (article_id, entity_name);

-- 19. article_signals — Detected early signals per article
CREATE TABLE IF NOT EXISTS article_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL
    CHECK (signal_type IN ('first_mention', 'tier1_before_mainstream', 'convergence', 'unusual_activity', 'sentiment_shift')),
  signal_label TEXT NOT NULL,
  entity_name TEXT,
  confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.5
    CHECK (confidence BETWEEN 0 AND 1),
  metadata JSONB DEFAULT '{}',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, signal_type, entity_name)
);

CREATE INDEX IF NOT EXISTS idx_article_signals_article ON article_signals (article_id);
CREATE INDEX IF NOT EXISTS idx_article_signals_type ON article_signals (signal_type, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_signals_entity ON article_signals (entity_name, detected_at DESC) WHERE entity_name IS NOT NULL;

ALTER TABLE entity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON entity_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON article_signals FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Done! All 19 tables created.
-- ============================================================
