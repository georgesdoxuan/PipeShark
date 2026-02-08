-- Add optional list of campaign IDs to user_schedule.
-- When set, only these campaigns are launched at launch_time; when null/empty, all campaigns (legacy).
ALTER TABLE user_schedule
  ADD COLUMN IF NOT EXISTS campaign_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN user_schedule.campaign_ids IS 'Campaign IDs to launch at launch_time; empty means all campaigns (legacy).';
