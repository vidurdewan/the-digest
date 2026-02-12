-- Rollback: 20260127000000_add_source_tiers_and_vip.sql

DROP POLICY IF EXISTS "Allow all access" ON daily_briefs;
DROP TABLE IF EXISTS daily_briefs;

ALTER TABLE settings DROP COLUMN IF EXISTS last_newsletter_fetch;
ALTER TABLE settings DROP COLUMN IF EXISTS vip_newsletters;

DROP INDEX IF EXISTS idx_newsletters_is_vip;
DROP INDEX IF EXISTS idx_newsletters_source_tier;
ALTER TABLE newsletters DROP COLUMN IF EXISTS is_vip;
ALTER TABLE newsletters DROP COLUMN IF EXISTS source_tier;

DROP INDEX IF EXISTS idx_articles_source_tier;
ALTER TABLE articles DROP COLUMN IF EXISTS source_tier;
