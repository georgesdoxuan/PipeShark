-- Add mode column to campaigns table
-- 'standard' = default workflow (existing)
-- 'local_businesses' = Google Maps local businesses workflow
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'standard';
