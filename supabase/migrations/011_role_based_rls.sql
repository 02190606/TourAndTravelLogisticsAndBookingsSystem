-- ============================================================
-- ROLE-BASED ROW LEVEL SECURITY
-- ============================================================
-- Creates a helper function user_role() that reads the role
-- column from the users table for the current auth user.
-- Then replaces all permissive RLS policies with role-aware ones.
-- ============================================================

-- Helper: returns the current user's role from the users table
CREATE OR REPLACE FUNCTION user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================
-- DROP OLD PERMISSIVE POLICIES
-- ============================================================

-- vehicles
DROP POLICY IF EXISTS "authenticated_read_vehicles" ON vehicles;
DROP POLICY IF EXISTS "authenticated_insert_vehicles" ON vehicles;
DROP POLICY IF EXISTS "authenticated_update_vehicles" ON vehicles;
DROP POLICY IF EXISTS "authenticated_delete_vehicles" ON vehicles;

-- service_records
DROP POLICY IF EXISTS "authenticated_read_service_records" ON service_records;
DROP POLICY IF EXISTS "authenticated_insert_service_records" ON service_records;
DROP POLICY IF EXISTS "authenticated_update_service_records" ON service_records;
DROP POLICY IF EXISTS "authenticated_delete_service_records" ON service_records;

-- maintenance_records
DROP POLICY IF EXISTS "authenticated_read_maintenance_records" ON maintenance_records;
DROP POLICY IF EXISTS "authenticated_insert_maintenance_records" ON maintenance_records;
DROP POLICY IF EXISTS "authenticated_update_maintenance_records" ON maintenance_records;
DROP POLICY IF EXISTS "authenticated_delete_maintenance_records" ON maintenance_records;

-- complaints
DROP POLICY IF EXISTS "authenticated_read_complaints" ON complaints;
DROP POLICY IF EXISTS "authenticated_insert_complaints" ON complaints;
DROP POLICY IF EXISTS "authenticated_update_complaints" ON complaints;
DROP POLICY IF EXISTS "authenticated_delete_complaints" ON complaints;

-- drivers
DROP POLICY IF EXISTS "authenticated_read_drivers" ON drivers;
DROP POLICY IF EXISTS "authenticated_insert_drivers" ON drivers;
DROP POLICY IF EXISTS "authenticated_update_drivers" ON drivers;
DROP POLICY IF EXISTS "authenticated_delete_drivers" ON drivers;

-- trips
DROP POLICY IF EXISTS "authenticated_read_trips" ON trips;
DROP POLICY IF EXISTS "authenticated_insert_trips" ON trips;
DROP POLICY IF EXISTS "authenticated_update_trips" ON trips;
DROP POLICY IF EXISTS "authenticated_delete_trips" ON trips;

-- payments
DROP POLICY IF EXISTS "authenticated_read_payments" ON payments;
DROP POLICY IF EXISTS "authenticated_insert_payments" ON payments;
DROP POLICY IF EXISTS "authenticated_update_payments" ON payments;
DROP POLICY IF EXISTS "authenticated_delete_payments" ON payments;

-- users
DROP POLICY IF EXISTS "authenticated_read_users" ON users;
DROP POLICY IF EXISTS "admin_all_users" ON users;

-- alert_settings
DROP POLICY IF EXISTS "authenticated_read_alert_settings" ON alert_settings;
DROP POLICY IF EXISTS "authenticated_insert_alert_settings" ON alert_settings;
DROP POLICY IF EXISTS "authenticated_update_alert_settings" ON alert_settings;
DROP POLICY IF EXISTS "authenticated_delete_alert_settings" ON alert_settings;

-- acknowledged_alerts
DROP POLICY IF EXISTS "authenticated_read_acknowledged_alerts" ON acknowledged_alerts;
DROP POLICY IF EXISTS "authenticated_insert_acknowledged_alerts" ON acknowledged_alerts;
DROP POLICY IF EXISTS "authenticated_delete_acknowledged_alerts" ON acknowledged_alerts;

-- sent_alerts
DROP POLICY IF EXISTS "authenticated_read_sent_alerts" ON sent_alerts;
DROP POLICY IF EXISTS "authenticated_insert_sent_alerts" ON sent_alerts;
DROP POLICY IF EXISTS "authenticated_delete_sent_alerts" ON sent_alerts;

-- Also drop policies from migration 009 that used wrong auth.role()
DROP POLICY IF EXISTS "admin_trips_read_trips" ON trips;
DROP POLICY IF EXISTS "admin_trips_read_payments" ON payments;
DROP POLICY IF EXISTS "admin_read_users" ON users;


-- ============================================================
-- VEHICLES: admin + logistics full, trips read-only
-- ============================================================
CREATE POLICY "vehicles_select" ON vehicles
  FOR SELECT USING (user_role() IN ('admin', 'logistics', 'trips'));

CREATE POLICY "vehicles_insert" ON vehicles
  FOR INSERT WITH CHECK (user_role() IN ('admin', 'logistics'));

CREATE POLICY "vehicles_update" ON vehicles
  FOR UPDATE USING (user_role() IN ('admin', 'logistics'));

CREATE POLICY "vehicles_delete" ON vehicles
  FOR DELETE USING (user_role() = 'admin');


-- ============================================================
-- SERVICE RECORDS: admin + logistics only
-- ============================================================
CREATE POLICY "service_records_select" ON service_records
  FOR SELECT USING (user_role() IN ('admin', 'logistics'));

CREATE POLICY "service_records_insert" ON service_records
  FOR INSERT WITH CHECK (user_role() IN ('admin', 'logistics'));

CREATE POLICY "service_records_update" ON service_records
  FOR UPDATE USING (user_role() IN ('admin', 'logistics'));

CREATE POLICY "service_records_delete" ON service_records
  FOR DELETE USING (user_role() IN ('admin', 'logistics'));


-- ============================================================
-- MAINTENANCE RECORDS: admin + logistics only
-- ============================================================
CREATE POLICY "maintenance_records_select" ON maintenance_records
  FOR SELECT USING (user_role() IN ('admin', 'logistics'));

CREATE POLICY "maintenance_records_insert" ON maintenance_records
  FOR INSERT WITH CHECK (user_role() IN ('admin', 'logistics'));

CREATE POLICY "maintenance_records_update" ON maintenance_records
  FOR UPDATE USING (user_role() IN ('admin', 'logistics'));

CREATE POLICY "maintenance_records_delete" ON maintenance_records
  FOR DELETE USING (user_role() IN ('admin', 'logistics'));


-- ============================================================
-- COMPLAINTS: admin + logistics only
-- ============================================================
CREATE POLICY "complaints_select" ON complaints
  FOR SELECT USING (user_role() IN ('admin', 'logistics'));

CREATE POLICY "complaints_insert" ON complaints
  FOR INSERT WITH CHECK (user_role() IN ('admin', 'logistics'));

CREATE POLICY "complaints_update" ON complaints
  FOR UPDATE USING (user_role() IN ('admin', 'logistics'));

CREATE POLICY "complaints_delete" ON complaints
  FOR DELETE USING (user_role() IN ('admin', 'logistics'));


-- ============================================================
-- DRIVERS: admin + logistics full, trips read-only
-- ============================================================
CREATE POLICY "drivers_select" ON drivers
  FOR SELECT USING (user_role() IN ('admin', 'logistics', 'trips'));

CREATE POLICY "drivers_insert" ON drivers
  FOR INSERT WITH CHECK (user_role() IN ('admin', 'logistics'));

CREATE POLICY "drivers_update" ON drivers
  FOR UPDATE USING (user_role() IN ('admin', 'logistics'));

CREATE POLICY "drivers_delete" ON drivers
  FOR DELETE USING (user_role() IN ('admin', 'logistics'));


-- ============================================================
-- TRIPS: admin + trips only
-- ============================================================
CREATE POLICY "trips_select" ON trips
  FOR SELECT USING (user_role() IN ('admin', 'trips'));

CREATE POLICY "trips_insert" ON trips
  FOR INSERT WITH CHECK (user_role() IN ('admin', 'trips'));

CREATE POLICY "trips_update" ON trips
  FOR UPDATE USING (user_role() IN ('admin', 'trips'));

CREATE POLICY "trips_delete" ON trips
  FOR DELETE USING (user_role() IN ('admin', 'trips'));


-- ============================================================
-- PAYMENTS: admin + trips only
-- ============================================================
CREATE POLICY "payments_select" ON payments
  FOR SELECT USING (user_role() IN ('admin', 'trips'));

CREATE POLICY "payments_insert" ON payments
  FOR INSERT WITH CHECK (user_role() IN ('admin', 'trips'));

CREATE POLICY "payments_update" ON payments
  FOR UPDATE USING (user_role() IN ('admin', 'trips'));

CREATE POLICY "payments_delete" ON payments
  FOR DELETE USING (user_role() IN ('admin', 'trips'));


-- ============================================================
-- USERS: all authenticated read, admin write
-- ============================================================
CREATE POLICY "users_select" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (user_role() = 'admin');

CREATE POLICY "users_update" ON users
  FOR UPDATE USING (user_role() = 'admin' OR id = auth.uid());

CREATE POLICY "users_delete" ON users
  FOR DELETE USING (user_role() = 'admin');


-- ============================================================
-- ALERT SETTINGS: all authenticated (manage their own)
-- ============================================================
CREATE POLICY "alert_settings_select" ON alert_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "alert_settings_insert" ON alert_settings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "alert_settings_update" ON alert_settings
  FOR UPDATE USING (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "alert_settings_delete" ON alert_settings
  FOR DELETE USING (auth.role() = 'authenticated' AND user_id = auth.uid());


-- ============================================================
-- ACKNOWLEDGED ALERTS: all authenticated (manage their own)
-- ============================================================
CREATE POLICY "acknowledged_alerts_select" ON acknowledged_alerts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "acknowledged_alerts_insert" ON acknowledged_alerts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "acknowledged_alerts_delete" ON acknowledged_alerts
  FOR DELETE USING (auth.role() = 'authenticated' AND user_id = auth.uid());


-- ============================================================
-- SENT ALERTS: all authenticated (read their own)
-- ============================================================
CREATE POLICY "sent_alerts_select" ON sent_alerts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "sent_alerts_insert" ON sent_alerts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "sent_alerts_delete" ON sent_alerts
  FOR DELETE USING (auth.role() = 'authenticated');
