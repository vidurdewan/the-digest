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
  ranking_score numeric(6, 2) default 0,
  document_type text,
  created_at timestamptz default now()
);

create index if not exists idx_articles_topic on articles(topic);
create index if not exists idx_articles_published on articles(published_at desc);
create index if not exists idx_articles_content_hash on articles(content_hash);
create index if not exists idx_articles_source_tier on articles(source_tier);
create index if not exists idx_articles_ranking_score on articles(ranking_score desc);
create index if not exists idx_articles_published_ranking on articles(published_at desc, ranking_score desc);
create index if not exists idx_articles_document_type on articles(document_type) where document_type is not null;

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
  deciphering jsonb,
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
  summary_the_news text,
  summary_why_it_matters text,
  summary_the_context text,
  summary_so_what text,
  summary_watch_next text,
  summary_recruiter_relevance text,
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
  vip_newsletters jsonb default '["Stratechery","Matt Levine","Money Stuff","The Diff","Eric Newcomer","Newcomer"]',
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

-- ============================================
-- ENTITY HISTORY (signal detection)
-- ============================================
create table if not exists entity_history (
  id uuid primary key default gen_random_uuid(),
  entity_name text not null,
  entity_type text not null default 'company'
    check (entity_type in ('company', 'person', 'fund', 'keyword', 'organization')),
  article_id uuid not null references articles(id) on delete cascade,
  source_tier integer not null default 3 check (source_tier in (1, 2, 3)),
  source_name text,
  sentiment_label text default 'neutral'
    check (sentiment_label in ('positive', 'negative', 'neutral')),
  sentiment_score numeric(4, 2) default 0,
  detected_at timestamptz not null default now(),
  created_at timestamptz default now()
);

create index if not exists idx_entity_history_name_time on entity_history(entity_name, detected_at desc);
create index if not exists idx_entity_history_article on entity_history(article_id);
create index if not exists idx_entity_history_tier_time on entity_history(source_tier, detected_at desc);
create unique index if not exists idx_entity_history_unique_mention on entity_history(article_id, entity_name);

-- ============================================
-- ARTICLE SIGNALS (early signal detection badges)
-- ============================================
create table if not exists article_signals (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  signal_type text not null
    check (signal_type in ('first_mention', 'tier1_before_mainstream', 'convergence', 'unusual_activity', 'sentiment_shift')),
  signal_label text not null,
  entity_name text,
  confidence numeric(3, 2) not null default 0.5
    check (confidence between 0 and 1),
  metadata jsonb default '{}',
  detected_at timestamptz not null default now(),
  created_at timestamptz default now(),
  unique(article_id, signal_type, entity_name)
);

create index if not exists idx_article_signals_article on article_signals(article_id);
create index if not exists idx_article_signals_type on article_signals(signal_type, detected_at desc);
create index if not exists idx_article_signals_entity on article_signals(entity_name, detected_at desc) where entity_name is not null;

-- ============================================
-- STORY THREADS (groups developing stories)
-- ============================================
create table if not exists story_threads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  first_seen_at timestamptz not null default now(),
  last_updated_at timestamptz not null default now(),
  article_count integer default 1,
  status text default 'active' check (status in ('active', 'resolved', 'stale')),
  created_at timestamptz default now()
);

-- ============================================
-- ARTICLE INTELLIGENCE (AI-computed per article)
-- ============================================
create table if not exists article_intelligence (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade unique,
  significance_score integer check (significance_score between 1 and 10),
  story_type text check (story_type in ('breaking', 'developing', 'analysis', 'opinion', 'feature', 'update')),
  connects_to jsonb default '[]',
  story_thread_id uuid references story_threads(id) on delete set null,
  watch_for_next text,
  is_surprise_candidate boolean default false,
  generated_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_article_intel_article on article_intelligence(article_id);
create index if not exists idx_article_intel_thread on article_intelligence(story_thread_id);
create index if not exists idx_article_intel_significance on article_intelligence(significance_score desc);

-- ============================================
-- ARTICLE REACTIONS (user feedback)
-- ============================================
create table if not exists article_reactions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade,
  reaction text not null check (reaction in ('already_knew', 'useful', 'surprising', 'bad_connection', 'not_important')),
  created_at timestamptz default now(),
  unique(article_id, reaction)
);

create index if not exists idx_reactions_article on article_reactions(article_id);

-- ============================================
-- REMINDERS (follow-up alerts)
-- ============================================
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade,
  remind_at timestamptz not null,
  note text,
  is_dismissed boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_reminders_date on reminders(remind_at) where not is_dismissed;

-- ============================================
-- READING PROGRESS (daily tracking)
-- ============================================
create table if not exists reading_progress (
  id uuid primary key default gen_random_uuid(),
  date date not null unique default current_date,
  total_priority_items integer default 0,
  items_read integer default 0,
  updated_at timestamptz default now()
);

-- ============================================
-- WEEKLY SYNTHESIS (auto-generated weekly summary)
-- ============================================
create table if not exists weekly_synthesis (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  week_end date not null,
  synthesis text not null,
  threads jsonb default '[]',
  patterns jsonb default '[]',
  generated_at timestamptz default now()
);
