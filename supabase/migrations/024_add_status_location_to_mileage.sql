-- Add status and current_location to mileage_records
ALTER TABLE mileage_records ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE mileage_records ADD COLUMN IF NOT EXISTS current_location TEXT;
