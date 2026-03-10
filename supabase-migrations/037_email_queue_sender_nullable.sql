-- Migration 037: Make sender_account_id nullable in email_queue to support Gmail-only users.
-- Gmail sends use OAuth tokens (not SMTP sender_accounts), so sender_account_id can be NULL
-- when connection_type = 'gmail'.

ALTER TABLE email_queue ALTER COLUMN sender_account_id DROP NOT NULL;
