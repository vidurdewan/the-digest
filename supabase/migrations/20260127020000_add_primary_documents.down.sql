-- Rollback: 20260127020000_add_primary_documents.sql

DROP INDEX IF EXISTS idx_summaries_deciphering;
DROP INDEX IF EXISTS idx_articles_document_type;
ALTER TABLE summaries DROP COLUMN IF EXISTS deciphering;
ALTER TABLE articles DROP COLUMN IF EXISTS document_type;
