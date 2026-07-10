-- Add 'sold' to vehicles status check constraint
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_status_check;

ALTER TABLE vehicles ADD CONSTRAINT vehicles_status_check
  CHECK (status IN ('available', 'on_trip', 'in_service', 'sold'));
