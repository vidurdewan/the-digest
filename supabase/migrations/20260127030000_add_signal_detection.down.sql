-- Rollback: 20260127030000_add_signal_detection.sql

DROP POLICY IF EXISTS "Allow all access" ON article_signals;
DROP POLICY IF EXISTS "Allow all access" ON entity_history;
DROP TABLE IF EXISTS article_signals;
DROP TABLE IF EXISTS entity_history;
