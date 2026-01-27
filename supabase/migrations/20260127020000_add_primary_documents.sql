-- Migration: Add primary document support (SEC EDGAR, Federal Reserve)
-- Adds document_type to articles and deciphering JSONB to summaries

-- 1. Add document_type column to articles
ALTER TABLE articles ADD COLUMN IF NOT EXISTS document_type TEXT;

-- 2. Add deciphering JSONB column to summaries
ALTER TABLE summaries ADD COLUMN IF NOT EXISTS deciphering JSONB;

-- 3. Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_articles_document_type ON articles (document_type) WHERE document_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_summaries_deciphering ON summaries ((deciphering IS NOT NULL)) WHERE deciphering IS NOT NULL;
