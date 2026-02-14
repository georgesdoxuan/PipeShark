-- Prevent double launch: cooldown per campaign (API checks last_started_at)
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS last_started_at TIMESTAMPTZ;

COMMENT ON COLUMN campaigns.last_started_at IS 'Set when campaign/start is called; used to block relaunch within cooldown (e.g. 2 min).';
