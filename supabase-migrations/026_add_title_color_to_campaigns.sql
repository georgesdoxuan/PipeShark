-- Title color for campaign cards on dashboard (hex, e.g. #1e3a5f).
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS title_color TEXT;

COMMENT ON COLUMN campaigns.title_color IS 'Hex color for campaign title on dashboard (e.g. #1e3a5f). Null = assign random dark variant on first display.';
