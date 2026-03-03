-- Log daily launch runs so the cron does not re-trigger the same campaign multiple times per day.
-- Used by /api/cron/launch-scheduled-campaigns to avoid loop when n8n calls the API again at workflow end.
CREATE TABLE IF NOT EXISTS daily_launch_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  launched_date DATE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, campaign_id, launched_date)
);

CREATE INDEX IF NOT EXISTS daily_launch_log_user_campaign_date_idx
  ON daily_launch_log(user_id, campaign_id, launched_date);

COMMENT ON TABLE daily_launch_log IS 'One row per (user, campaign) per UTC day. Prevents re-triggering the same campaign when n8n workflow calls launch-scheduled-campaigns again.';
