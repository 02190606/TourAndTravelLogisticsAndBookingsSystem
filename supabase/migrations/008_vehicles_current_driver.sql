ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_driver_id TEXT REFERENCES drivers(id);

CREATE INDEX IF NOT EXISTS idx_vehicles_current_driver ON vehicles(current_driver_id);
