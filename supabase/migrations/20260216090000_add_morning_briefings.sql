-- Add cached morning briefings for "since last seen" intelligence updates

CREATE TABLE IF NOT EXISTS morning_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  since_marker TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  what_changed JSONB NOT NULL DEFAULT '[]',
  action_items JSONB NOT NULL DEFAULT '[]',
  threads JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_morning_briefings_generated_at
  ON morning_briefings (generated_at DESC);

ALTER TABLE morning_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON morning_briefings
  FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
