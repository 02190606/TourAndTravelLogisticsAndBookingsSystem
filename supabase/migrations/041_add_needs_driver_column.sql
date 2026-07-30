ALTER TABLE trips ADD COLUMN IF NOT EXISTS needs_driver boolean DEFAULT false;

NOTIFY pgrst, 'reload schema';
