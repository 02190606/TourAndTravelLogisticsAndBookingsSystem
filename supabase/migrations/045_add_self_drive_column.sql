ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_self_drive boolean DEFAULT false;

NOTIFY pgrst, 'reload schema';
