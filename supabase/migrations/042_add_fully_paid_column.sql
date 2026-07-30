ALTER TABLE trips ADD COLUMN IF NOT EXISTS fully_paid boolean DEFAULT false;

NOTIFY pgrst, 'reload schema';
