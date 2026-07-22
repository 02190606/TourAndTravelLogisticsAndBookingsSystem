-- Relax NOT NULL constraints to allow incremental data collection
-- Fields that should be optional now get DEFAULT '' or allow NULL

-- Drivers: license_number no longer required
ALTER TABLE drivers ALTER COLUMN license_number DROP NOT NULL;
ALTER TABLE drivers ALTER COLUMN license_number SET DEFAULT '';

-- Complaints: vehicle_id no longer required (can file complaint without linking vehicle yet)
ALTER TABLE complaints ALTER COLUMN vehicle_id DROP NOT NULL;

-- Penalties: vehicle_id no longer required
ALTER TABLE penalties ALTER COLUMN vehicle_id DROP NOT NULL;

-- Service records: service_date no longer required
ALTER TABLE service_records ALTER COLUMN service_date DROP NOT NULL;
ALTER TABLE service_records ALTER COLUMN service_date SET DEFAULT '';

-- Repairs: multiple fields no longer required
ALTER TABLE repairs ALTER COLUMN date_of_repair DROP NOT NULL;
ALTER TABLE repairs ALTER COLUMN date_of_repair SET DEFAULT '';
ALTER TABLE repairs ALTER COLUMN issue_description DROP NOT NULL;
ALTER TABLE repairs ALTER COLUMN issue_description SET DEFAULT '';
ALTER TABLE repairs ALTER COLUMN urgency DROP NOT NULL;
ALTER TABLE repairs ALTER COLUMN urgency SET DEFAULT 'medium';
ALTER TABLE repairs ALTER COLUMN cost DROP NOT NULL;
ALTER TABLE repairs ALTER COLUMN cost SET DEFAULT 0;
ALTER TABLE repairs ALTER COLUMN status DROP NOT NULL;
ALTER TABLE repairs ALTER COLUMN status SET DEFAULT 'scheduled';
