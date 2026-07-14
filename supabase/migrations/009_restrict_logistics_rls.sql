-- Restrict SELECT access: logistics users can no longer read trips, payments, or users tables
-- Admin and trips roles retain full read access; logistics stays in their zone

-- Trips: admin + trips only
DROP POLICY IF EXISTS "authenticated_read_trips" ON trips;
CREATE POLICY "admin_trips_read_trips" ON trips
  FOR SELECT USING (auth.role() IN ('admin', 'trips'));

-- Payments: admin + trips only
DROP POLICY IF EXISTS "authenticated_read_payments" ON payments;
CREATE POLICY "admin_trips_read_payments" ON payments
  FOR SELECT USING (auth.role() IN ('admin', 'trips'));

-- Users: admin only
DROP POLICY IF EXISTS "authenticated_read_users" ON users;
CREATE POLICY "admin_read_users" ON users
  FOR SELECT USING (auth.role() = 'admin');
