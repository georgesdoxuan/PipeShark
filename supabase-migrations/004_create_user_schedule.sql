-- User schedule for daily campaign launches
CREATE TABLE IF NOT EXISTS user_schedule (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  launch_time TEXT NOT NULL, -- Format "HH:MM" (e.g. "17:43")
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own schedule"
  ON user_schedule FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
