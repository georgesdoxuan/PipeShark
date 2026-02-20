-- Option for Daily Launch: create Gmail drafts only, or add to send queue (SMTP at scheduled times).
ALTER TABLE user_schedule
  ADD COLUMN IF NOT EXISTS launch_delivery_mode TEXT DEFAULT 'queue';

-- Constrain to known values; default 'queue' = current behavior (enqueue → n8n sends).
ALTER TABLE user_schedule
  ADD CONSTRAINT chk_launch_delivery_mode
  CHECK (launch_delivery_mode IS NULL OR launch_delivery_mode IN ('drafts', 'queue'));

COMMENT ON COLUMN user_schedule.launch_delivery_mode IS 'drafts = create Gmail drafts only at launch; queue = add to send queue (sent at scheduled times). Default: queue.';
