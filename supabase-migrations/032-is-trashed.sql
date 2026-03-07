-- Migration 032: Add is_trashed column to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_trashed BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS leads_is_trashed_idx ON leads(user_id, is_trashed);
