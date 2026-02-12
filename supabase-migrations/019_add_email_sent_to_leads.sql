-- Track whether the user has sent the email to the lead (from their mailbox)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_leads_email_sent ON leads(user_id, email_sent) WHERE email_sent = TRUE;
