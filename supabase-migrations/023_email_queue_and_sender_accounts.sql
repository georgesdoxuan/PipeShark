-- Email queue for SMTP sending (replaces Gmail drafts flow).
-- sender_accounts: SMTP/IMAP credentials per user (one per sending identity).
-- email_queue: pending/sent/failed emails with scheduled_at for throttling.

-- Sender accounts: one row per sending identity (primary + Pro secondaries).
CREATE TABLE IF NOT EXISTS sender_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 465,
  smtp_user TEXT,
  smtp_pass_encrypted TEXT,
  imap_host TEXT,
  imap_port INTEGER DEFAULT 993,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_sender_accounts_user_id ON sender_accounts(user_id);

ALTER TABLE sender_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sender accounts"
  ON sender_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sender accounts"
  ON sender_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sender accounts"
  ON sender_accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sender accounts"
  ON sender_accounts FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE sender_accounts IS 'SMTP/IMAP credentials for sending (Gmail App Password, etc.). smtp_pass_encrypted is decrypted by the app using ENCRYPTION_KEY.';
COMMENT ON COLUMN sender_accounts.email IS 'Sender email address (e.g. user@gmail.com).';

-- Email queue: one row per email to send.
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_account_id UUID NOT NULL REFERENCES sender_accounts(id) ON DELETE CASCADE,
  lead_id UUID,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  error_log TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_user_id ON email_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_status ON email_queue(scheduled_at, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_lead_id ON email_queue(lead_id) WHERE lead_id IS NOT NULL;

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email queue"
  ON email_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email queue"
  ON email_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- n8n (service role) will update status; RLS allows only own rows for users.
CREATE POLICY "Users can update own email queue"
  ON email_queue FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE email_queue IS 'Queue of emails to send via SMTP. n8n cron reads pending rows where scheduled_at <= now, sends with nodemailer, then sets status = sent.';
COMMENT ON COLUMN email_queue.lead_id IS 'Optional link to leads.id (no FK to avoid migration dependency). When status becomes sent, set lead.email_sent = true.';
