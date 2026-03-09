-- Migration 033: Add gdpr_purged_at column to leads for GDPR-compliant PII erasure
-- Leads without replies older than 30 days will have their PII stripped
-- but the row is preserved so analytics counts (email_sent, replied) remain accurate.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS gdpr_purged_at TIMESTAMPTZ DEFAULT NULL;

-- Index for the cron query (find non-purged, non-replied old leads)
CREATE INDEX IF NOT EXISTS leads_gdpr_purge_idx
  ON leads (user_id, gdpr_purged_at, replied, created_at)
  WHERE gdpr_purged_at IS NULL AND (replied IS NULL OR replied = false);
