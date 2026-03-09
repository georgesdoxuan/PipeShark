-- 035: campaign presets + ai_instructions on campaigns

-- Add ai_instructions to campaigns table (for per-campaign custom AI instructions)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ai_instructions TEXT DEFAULT NULL;

-- Campaign presets: reusable campaign configurations (templates)
CREATE TABLE IF NOT EXISTS campaign_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  business_type TEXT,
  company_description TEXT,
  tone_of_voice TEXT,
  campaign_goal TEXT,
  magic_link TEXT,
  city_size TEXT,
  cities TEXT[],
  business_link_text TEXT,
  email_max_length INTEGER DEFAULT 150,
  example_email TEXT,
  ai_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE campaign_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own campaign presets"
  ON campaign_presets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
