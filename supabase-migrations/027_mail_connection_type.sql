-- User preference: use SMTP or Gmail for both send and draft from the queue.
-- email_queue.connection_type is set when enqueueing from this preference.

-- user_profiles: mail connection preference (SMTP or Gmail)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS mail_connection_type TEXT NOT NULL DEFAULT 'smtp';

ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS chk_user_profiles_mail_connection_type;
ALTER TABLE user_profiles
  ADD CONSTRAINT chk_user_profiles_mail_connection_type
  CHECK (mail_connection_type IN ('smtp', 'gmail'));

COMMENT ON COLUMN user_profiles.mail_connection_type IS 'smtp = send/draft via SMTP (sender_accounts); gmail = send/draft via Gmail OAuth. Used when enqueueing and by n8n APIs.';

-- email_queue: how this row should be sent/drafted (from user preference at enqueue time)
ALTER TABLE email_queue
  ADD COLUMN IF NOT EXISTS connection_type TEXT NOT NULL DEFAULT 'smtp';

ALTER TABLE email_queue
  DROP CONSTRAINT IF EXISTS chk_email_queue_connection_type;
ALTER TABLE email_queue
  ADD CONSTRAINT chk_email_queue_connection_type
  CHECK (connection_type IN ('smtp', 'gmail'));

COMMENT ON COLUMN email_queue.connection_type IS 'smtp = use send-email SMTP or mark draft in DB; gmail = use Gmail API for send or create-draft. Set from user_profiles.mail_connection_type when enqueueing.';

-- Allow status = 'draft' (e.g. when connection_type is SMTP and delivery_type is draft)
ALTER TABLE email_queue
  DROP CONSTRAINT IF EXISTS email_queue_status_check;
ALTER TABLE email_queue
  ADD CONSTRAINT email_queue_status_check
  CHECK (status IN ('pending', 'sent', 'failed', 'cancelled', 'draft'));
