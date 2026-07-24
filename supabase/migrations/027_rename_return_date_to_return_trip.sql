-- Rename return_date column to return_trip to match application naming
ALTER TABLE trips RENAME COLUMN return_date TO return_trip;
