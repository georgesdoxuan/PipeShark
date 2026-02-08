-- Track email replies for leads (Gmail thread + replied status)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS replied BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS gmail_thread_id TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_replied ON leads(user_id, replied);
CREATE INDEX IF NOT EXISTS idx_leads_gmail_thread_id ON leads(gmail_thread_id) WHERE gmail_thread_id IS NOT NULL;
