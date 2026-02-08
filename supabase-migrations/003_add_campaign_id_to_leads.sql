-- Add campaign_id to leads table to associate each lead with a specific campaign
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

-- Index for faster lookups by campaign
CREATE INDEX IF NOT EXISTS leads_campaign_id_idx ON leads(campaign_id);
