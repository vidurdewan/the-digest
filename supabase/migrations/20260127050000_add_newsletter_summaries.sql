-- Add summary columns to newsletters table
-- These columns store AI-generated newsletter summaries so they persist across page loads
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS summary_the_news TEXT;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS summary_why_it_matters TEXT;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS summary_the_context TEXT;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS summary_so_what TEXT;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS summary_watch_next TEXT;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS summary_recruiter_relevance TEXT;
