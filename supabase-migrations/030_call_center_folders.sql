-- Call Center: folders to organize leads
CREATE TABLE IF NOT EXISTS call_center_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_center_folders_user_id ON call_center_folders(user_id);

-- RLS: users can only access their own folders
ALTER TABLE call_center_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own folders"
  ON call_center_folders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
