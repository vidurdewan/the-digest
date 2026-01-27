-- Update VIP newsletter defaults to include all must-read sources
-- Only updates if current value is the original default (just Stratechery)
UPDATE settings
SET vip_newsletters = '["Stratechery","Matt Levine","Money Stuff","The Diff","Eric Newcomer","Newcomer"]'::jsonb,
    updated_at = NOW()
WHERE vip_newsletters = '["Stratechery"]'::jsonb
   OR vip_newsletters IS NULL;
