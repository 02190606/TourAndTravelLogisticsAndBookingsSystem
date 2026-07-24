-- Relax NOT NULL constraints on trips to allow incremental/partial saves
-- Previously these were required; now any field can be saved as null

ALTER TABLE trips ALTER COLUMN client_name DROP NOT NULL;
ALTER TABLE trips ALTER COLUMN client_name SET DEFAULT '';

ALTER TABLE trips ALTER COLUMN trip_start_date DROP NOT NULL;
ALTER TABLE trips ALTER COLUMN trip_start_date SET DEFAULT '';

ALTER TABLE trips ALTER COLUMN trip_end_date DROP NOT NULL;
ALTER TABLE trips ALTER COLUMN trip_end_date SET DEFAULT '';
