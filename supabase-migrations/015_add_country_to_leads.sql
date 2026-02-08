-- Add country to leads so the draft modal can show "City, Country" in the city pill.
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS country TEXT;
