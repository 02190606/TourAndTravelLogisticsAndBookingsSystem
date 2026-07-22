ALTER TABLE complaints ADD COLUMN driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL;
ALTER TABLE complaints ADD COLUMN incident_date TEXT;

ALTER TABLE penalties ADD COLUMN driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL;
ALTER TABLE penalties ADD COLUMN incident_date TEXT;
