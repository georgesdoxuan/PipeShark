-- Add name column to campaigns (optional, for user-defined campaign name)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS name TEXT;
