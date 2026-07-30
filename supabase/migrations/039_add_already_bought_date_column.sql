ALTER TABLE trips ADD COLUMN IF NOT EXISTS already_bought_date date;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS already_bought_qty integer;

NOTIFY pgrst, 'reload schema';
