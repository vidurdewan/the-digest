-- Rollback: 20260127080000_add_intelligence_tables.sql

DROP POLICY IF EXISTS "Allow all access" ON weekly_synthesis;
DROP POLICY IF EXISTS "Allow all access" ON reading_progress;
DROP POLICY IF EXISTS "Allow all access" ON reminders;
DROP POLICY IF EXISTS "Allow all access" ON article_reactions;
DROP POLICY IF EXISTS "Allow all access" ON article_intelligence;
DROP POLICY IF EXISTS "Allow all access" ON story_threads;

DROP TABLE IF EXISTS weekly_synthesis;
DROP TABLE IF EXISTS reading_progress;
DROP TABLE IF EXISTS reminders;
DROP TABLE IF EXISTS article_reactions;
DROP TABLE IF EXISTS article_intelligence;
DROP TABLE IF EXISTS story_threads;

NOTIFY pgrst, 'reload schema';
