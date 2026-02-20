-- Exécute ce fichier dans Supabase SQL Editor pour appliquer toutes les migrations en attente
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- 007: Add name to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS name TEXT;

-- 008: Add campaign_name to company_descriptions
ALTER TABLE company_descriptions ADD COLUMN IF NOT EXISTS campaign_name TEXT;

-- 009: Add mode to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'standard';

-- 010: Create user_profiles with Gmail columns (for OAuth Gmail)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_access_token TEXT,
  gmail_refresh_token TEXT,
  gmail_token_expiry TIMESTAMPTZ,
  gmail_email TEXT,
  gmail_connected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 011: Create todos table
CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own todos" ON todos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own todos" ON todos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own todos" ON todos FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own todos" ON todos FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS todos_user_id_idx ON todos(user_id);
CREATE INDEX IF NOT EXISTS todos_created_at_idx ON todos(created_at DESC);

-- 012: Add status column to todos (todo, doing, done)
ALTER TABLE todos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'todo';
UPDATE todos SET status = 'done' WHERE completed = true;

-- 014: cities table (if missing, see 014_create_cities_table.sql)
-- 015: Add country to leads (for timezone / business-hours scheduling)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS country TEXT;

-- 013: Create email_templates (example emails for AI inspiration, reusable)
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own email templates" ON email_templates;
CREATE POLICY "Users can manage own email templates"
  ON email_templates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS email_templates_user_id_idx ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS email_templates_created_at_idx ON email_templates(created_at DESC);
