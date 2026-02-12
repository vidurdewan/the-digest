-- Rollback: 20260127050000_add_newsletter_summaries.sql

ALTER TABLE newsletters DROP COLUMN IF EXISTS summary_recruiter_relevance;
ALTER TABLE newsletters DROP COLUMN IF EXISTS summary_watch_next;
ALTER TABLE newsletters DROP COLUMN IF EXISTS summary_so_what;
ALTER TABLE newsletters DROP COLUMN IF EXISTS summary_the_context;
ALTER TABLE newsletters DROP COLUMN IF EXISTS summary_why_it_matters;
ALTER TABLE newsletters DROP COLUMN IF EXISTS summary_the_news;
