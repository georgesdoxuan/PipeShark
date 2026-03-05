-- Store business name (e.g. "Superior Plumbing & Heating") for display in the leads table.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS name TEXT;
