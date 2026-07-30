ALTER TABLE trips ADD COLUMN IF NOT EXISTS gorilla_tracking_date date;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS gorilla_tracking_qty integer;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS gorilla_habituation_date date;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS gorilla_habituation_qty integer;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS chimpanzee_tracking_date date;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS chimpanzee_tracking_qty integer;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS chimpanzee_habituation_date date;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS chimpanzee_habituation_qty integer;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS golden_monkey_tracking_date date;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS golden_monkey_tracking_qty integer;

NOTIFY pgrst, 'reload schema';
