-- The Digest: Database Schema
-- Run this in your Supabase SQL Editor to set up all tables.

-- ============================================
-- GMAIL OAUTH TOKENS
-- ============================================
create table if not exists gmail_tokens (
  id text primary key default 'default',
  access_token text,
  refresh_token text,
  expiry_date bigint,
  scope text,
  token_type text,
  updated_at timestamptz default now()
);

-- ============================================
-- USERS
-- ============================================
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- SOURCES (RSS feeds, news APIs, etc.)
-- ============================================
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  type text not null check (type in ('rss', 'api', 'newsletter')),
  topic text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================
-- ARTICLES
-- ============================================
create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id) on delete set null,
  title text not null,
  url text,
  author text,
  content text,
  image_url text,
  published_at timestamptz,
  topic text not null,
  reading_time_minutes integer default 3,
  content_hash text unique,
  source_tier integer default 3 check (source_tier in (1, 2, 3)),
  created_at timestamptz default now()
);

create index if not exists idx_articles_topic on articles(topic);
create index if not exists idx_articles_published on articles(published_at desc);
create index if not exists idx_articles_content_hash on articles(content_hash);
create index if not exists idx_articles_source_tier on articles(source_tier);

-- ============================================
-- SUMMARIES (AI-generated, linked to articles)
-- ============================================
create table if not exists summaries (
  id uuid primary key default gen_random_uuid(),
  article_id uuid unique references articles(id) on delete cascade,
  brief text,
  the_news text,
  why_it_matters text,
  the_context text,
  key_entities jsonb default '[]',
  model_used text default 'claude-sonnet-4-20250514',
  tokens_used integer default 0,
  generated_at timestamptz default now()
);

-- ============================================
-- NEWSLETTERS (parsed email content)
-- ============================================
create table if not exists newsletters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  gmail_message_id text unique,
  publication text not null,
  subject text not null,
  sender_email text,
  content text,
  received_at timestamptz,
  is_read boolean default false,
  is_vip boolean default false,
  source_tier integer default 3 check (source_tier in (1, 2, 3)),
  created_at timestamptz default now()
);

create index if not exists idx_newsletters_received on newsletters(received_at desc);
create index if not exists idx_newsletters_source_tier on newsletters(source_tier);
create index if not exists idx_newsletters_is_vip on newsletters(is_vip) where is_vip = true;

-- ============================================
-- WATCHLIST
-- ============================================
create table if not exists watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('company', 'fund', 'person', 'keyword')),
  created_at timestamptz default now()
);

-- ============================================
-- SAVED ARTICLES
-- ============================================
create table if not exists saved_articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  article_id uuid references articles(id) on delete cascade,
  saved_at timestamptz default now(),
  unique(user_id, article_id)
);

-- ============================================
-- ANNOTATIONS (user notes on articles)
-- ============================================
create table if not exists annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  article_id uuid references articles(id) on delete cascade,
  note text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- ENGAGEMENT TRACKING
-- ============================================
create table if not exists engagement (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  article_id uuid references articles(id) on delete cascade,
  event_type text not null check (event_type in ('click', 'read', 'save', 'share', 'expand')),
  duration_seconds integer,
  created_at timestamptz default now()
);

create index if not exists idx_engagement_user on engagement(user_id);
create index if not exists idx_engagement_article on engagement(article_id);

-- ============================================
-- SETTINGS (user preferences)
-- ============================================
create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references users(id) on delete cascade,
  theme text default 'light' check (theme in ('light', 'dark', 'newspaper')),
  topic_preferences jsonb default '{}',
  vip_newsletters jsonb default '["Stratechery"]',
  last_newsletter_fetch timestamptz,
  notifications_enabled boolean default true,
  quiet_hours_start time,
  quiet_hours_end time,
  daily_budget_cents integer default 100,
  updated_at timestamptz default now()
);

-- ============================================
-- API USAGE TRACKING (daily cost tracking)
-- ============================================
create table if not exists api_usage (
  id uuid primary key default gen_random_uuid(),
  date date unique not null,
  input_tokens integer default 0,
  output_tokens integer default 0,
  cost_cents integer default 0,
  call_count integer default 0,
  created_at timestamptz default now()
);

create index if not exists idx_api_usage_date on api_usage(date desc);

-- ============================================
-- DAILY BRIEFS (cached narrative briefs)
-- ============================================
create table if not exists daily_briefs (
  id uuid primary key default gen_random_uuid(),
  date_key text unique not null,
  brief text not null,
  generated_at timestamptz default now()
);
