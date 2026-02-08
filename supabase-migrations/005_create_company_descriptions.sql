-- Saved company descriptions for reuse across campaigns
CREATE TABLE IF NOT EXISTS company_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE company_descriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own descriptions"
  ON company_descriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
