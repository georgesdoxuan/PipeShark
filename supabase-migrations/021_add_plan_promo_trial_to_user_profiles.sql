-- Plan, promo code and trial for user_profiles
-- plan: 'trial' | 'standard' | 'pro' | 'business'
-- promo_code: when set to 'RBXNHGOP', user gets Standard for free (30 credits/day)
-- trial_ends_at: end of 7-day free trial (used when plan = 'trial')
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS promo_code TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN user_profiles.promo_code IS 'When set to RBXNHGOP, user has Standard plan for free (30 credits/day).';
COMMENT ON COLUMN user_profiles.plan IS 'trial | standard | pro | business. Standard = 30 credits/day.';
COMMENT ON COLUMN user_profiles.trial_ends_at IS 'End of 7-day free trial when plan = trial.';
