-- delivery_type: 'send' = send via SMTP at scheduled_at; 'draft' = create Gmail draft at scheduled_at.
-- Same queue, same scheduled_at distribution; n8n Schedule workflow branches on this column.
ALTER TABLE email_queue
  ADD COLUMN IF NOT EXISTS delivery_type TEXT NOT NULL DEFAULT 'send';

ALTER TABLE email_queue
  DROP CONSTRAINT IF EXISTS chk_email_queue_delivery_type;
ALTER TABLE email_queue
  ADD CONSTRAINT chk_email_queue_delivery_type
  CHECK (delivery_type IN ('send', 'draft'));

COMMENT ON COLUMN email_queue.delivery_type IS 'send = send via SMTP; draft = create Gmail draft at scheduled_at. n8n Schedule handles both.';
