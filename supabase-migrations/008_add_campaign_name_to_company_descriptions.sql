-- Add campaign_name to company_descriptions for display in the list
ALTER TABLE company_descriptions ADD COLUMN IF NOT EXISTS campaign_name TEXT;
