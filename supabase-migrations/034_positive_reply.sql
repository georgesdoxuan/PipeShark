-- 034: AI sentiment classification of prospect replies
ALTER TABLE leads ADD COLUMN IF NOT EXISTS positive_reply BOOLEAN DEFAULT NULL;

-- Index for fast counting of positive replies per user
CREATE INDEX IF NOT EXISTS leads_positive_reply_idx ON leads (user_id, positive_reply)
  WHERE replied = true;
