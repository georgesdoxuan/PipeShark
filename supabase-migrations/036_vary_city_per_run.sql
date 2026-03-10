-- Migration 036: Add vary_city_per_run flag to campaigns
-- When true, each daily launch draws a new random city from citySize instead of reusing saved cities.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS vary_city_per_run BOOLEAN NOT NULL DEFAULT FALSE;
