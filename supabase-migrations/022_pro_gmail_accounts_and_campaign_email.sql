-- Pro plan: up to 3 Gmail accounts per user. Additional accounts (2nd, 3rd) stored here.
-- Primary account stays in user_profiles (gmail_*). Count = 1 from profile + rows here.
CREATE TABLE IF NOT EXISTS user_gmail_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  gmail_access_token TEXT,
  gmail_refresh_token TEXT,
  gmail_token_expiry TIMESTAMPTZ,
  gmail_connected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_user_gmail_accounts_user_id ON user_gmail_accounts(user_id);

ALTER TABLE user_gmail_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gmail accounts"
  ON user_gmail_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gmail accounts"
  ON user_gmail_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gmail accounts"
  ON user_gmail_accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own gmail accounts"
  ON user_gmail_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Which Gmail account runs this campaign (email address). Null = use primary (user_profiles).
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS gmail_email TEXT;

COMMENT ON TABLE user_gmail_accounts IS 'Pro plan: additional Gmail accounts (2nd and 3rd). Primary is in user_profiles.';
COMMENT ON COLUMN campaigns.gmail_email IS 'For Pro: which connected Gmail account to use for this campaign. Null = primary.';
