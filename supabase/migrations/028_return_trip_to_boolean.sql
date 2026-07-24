-- Ensure return_trip is BOOLEAN (drop if exists with wrong type, re-add as boolean)
ALTER TABLE trips DROP COLUMN IF EXISTS return_trip;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS return_trip boolean DEFAULT false;
