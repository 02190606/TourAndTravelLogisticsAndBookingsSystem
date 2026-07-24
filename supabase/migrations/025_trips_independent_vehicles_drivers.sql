-- Add source column to track which module created the record
-- 'logistics' = visible in both modules, 'trips' = visible only in trips

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'logistics';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'logistics';

-- Allow trips role to INSERT and UPDATE vehicles and drivers
DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
CREATE POLICY "vehicles_insert" ON vehicles
  FOR INSERT WITH CHECK (user_role() IN ('admin', 'logistics', 'trips'));

DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
CREATE POLICY "vehicles_update" ON vehicles
  FOR UPDATE USING (user_role() IN ('admin', 'logistics', 'trips'));

DROP POLICY IF EXISTS "drivers_insert" ON drivers;
CREATE POLICY "drivers_insert" ON drivers
  FOR INSERT WITH CHECK (user_role() IN ('admin', 'logistics', 'trips'));

DROP POLICY IF EXISTS "drivers_update" ON drivers;
CREATE POLICY "drivers_update" ON drivers
  FOR UPDATE USING (user_role() IN ('admin', 'logistics', 'trips'));
