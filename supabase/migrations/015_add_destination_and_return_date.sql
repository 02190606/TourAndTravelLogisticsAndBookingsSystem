ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination text;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS return_date date;
