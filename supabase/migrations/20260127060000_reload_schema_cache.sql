-- Force PostgREST to reload its schema cache
-- This ensures newly created FK relationships (article_intelligence, article_signals)
-- are detected for Supabase query joins
NOTIFY pgrst, 'reload schema';
