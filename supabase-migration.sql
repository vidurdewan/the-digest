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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_topic ON articles (topic);
CREATE INDEX IF NOT EXISTS idx_articles_content_hash ON articles (content_hash);

-- 3. summaries
CREATE TABLE IF NOT EXISTS summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID UNIQUE REFERENCES articles(id) ON DELETE CASCADE,
  brief TEXT,
  the_news TEXT,
  why_it_matters TEXT,
  the_context TEXT,
  key_entities JSONB DEFAULT '[]',
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletters_received_at ON newsletters (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletters_gmail_id ON newsletters (gmail_message_id);

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

-- ============================================================
-- Done! All 11 tables created.
-- ============================================================
