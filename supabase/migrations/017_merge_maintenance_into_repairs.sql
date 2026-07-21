-- Merge maintenance_records into repairs, then drop maintenance_records

-- 1. Copy all maintenance records into repairs table
INSERT INTO repairs (id, vehicle_id, date_of_repair, issue_description, repair_description, urgency, workshop_mechanic, cost, status, created_at)
SELECT
  'REP-' || substring(m.id from 5) as id,
  m.vehicle_id,
  m.repair_date::DATE as date_of_repair,
  array_to_string(m.repair_types, ', ') as issue_description,
  'Migrated from maintenance' as repair_description,
  'medium' as urgency,
  CASE
    WHEN m.mechanic_id <> '' AND m.garage <> '' THEN m.mechanic_id || ' @ ' || m.garage
    WHEN m.mechanic_id <> '' THEN m.mechanic_id
    WHEN m.garage <> '' THEN m.garage
    ELSE ''
  END as workshop_mechanic,
  m.cost,
  'completed' as status,
  m.created_at
FROM maintenance_records m;

-- 2. Drop maintenance_records table
DROP INDEX IF EXISTS idx_maintenance_records_vehicle;
DROP TABLE IF EXISTS maintenance_records;
