ALTER TABLE trips ADD COLUMN IF NOT EXISTS needs_accommodation BOOLEAN DEFAULT false;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accommodation_name TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accommodation_checkin DATE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accommodation_checkout DATE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accommodation_rooms INTEGER;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accommodation_cost NUMERIC;
