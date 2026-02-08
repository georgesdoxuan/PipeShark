-- Add number_credits_used column to campaigns (if not already added)
-- Represents the number of leads selected (1-20) when creating the campaign
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS number_credits_used INTEGER DEFAULT 0;
