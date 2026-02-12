-- Rollback: 20260127060000_reload_schema_cache.sql
-- This migration only sent a PostgREST schema reload notification.
-- No rollback needed, but trigger another reload for consistency.
NOTIFY pgrst, 'reload schema';
