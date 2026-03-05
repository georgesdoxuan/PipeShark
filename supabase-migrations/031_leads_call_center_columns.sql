-- Call Center: preparation summary (website + Maps), notes, called, comments, folder
ALTER TABLE leads ADD COLUMN IF NOT EXISTS preparation_summary TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS call_notes TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS called BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES call_center_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_folder_id ON leads(folder_id) WHERE folder_id IS NOT NULL;
