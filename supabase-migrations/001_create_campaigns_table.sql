-- Create campaigns table for persisting user campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_type TEXT NOT NULL,
  company_description TEXT,
  tone_of_voice TEXT DEFAULT 'professional',
  campaign_goal TEXT DEFAULT 'book_call',
  magic_link TEXT,
  cities TEXT[],
  city_size TEXT DEFAULT '1M+',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own campaigns
CREATE POLICY "Users can view own campaigns"
  ON campaigns FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: users can insert their own campaigns
CREATE POLICY "Users can insert own campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: users can update their own campaigns
CREATE POLICY "Users can update own campaigns"
  ON campaigns FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for faster lookups by user
CREATE INDEX IF NOT EXISTS campaigns_user_id_idx ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS campaigns_created_at_idx ON campaigns(created_at DESC);
