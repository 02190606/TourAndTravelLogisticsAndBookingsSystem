ALTER TABLE trips ADD COLUMN IF NOT EXISTS car_seats integer;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS has_gps boolean;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS extras text;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS gorilla_tracking boolean;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS chimpanzee_tracking boolean;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS activities text;
