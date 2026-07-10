-- Users table (syncs with Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'logistics' CHECK (role IN ('admin', 'logistics', 'trips')),
  full_name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  registration_number TEXT UNIQUE NOT NULL,
  make TEXT DEFAULT '',
  model TEXT DEFAULT '',
  year INTEGER DEFAULT 2024,
  mileage INTEGER DEFAULT 0,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'on_trip', 'in_service', 'sold')),
  driving_permit TEXT DEFAULT '',
  permit_expiry_date TEXT DEFAULT '',
  current_location TEXT DEFAULT '',
  insurance_commencement TEXT DEFAULT '',
  insurance_expiry TEXT DEFAULT '',
  pmo_commencement TEXT DEFAULT '',
  pmo_expiry TEXT DEFAULT '',
  psv_expiry TEXT DEFAULT '',
  has_toolbox BOOLEAN DEFAULT true,
  additional_requirements TEXT DEFAULT '',
  chassis_number TEXT DEFAULT '',
  fuel_type TEXT DEFAULT 'petrol',
  engine_capacity TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Service records
CREATE TABLE IF NOT EXISTS service_records (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  service_date TEXT NOT NULL,
  description TEXT DEFAULT '',
  next_service_date TEXT DEFAULT '',
  place_done TEXT DEFAULT '',
  cost INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Maintenance records
CREATE TABLE IF NOT EXISTS maintenance_records (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  mechanic_id TEXT DEFAULT '',
  repair_types TEXT[] DEFAULT '{}',
  repair_date TEXT NOT NULL,
  garage TEXT DEFAULT '',
  cost INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Complaints
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  complaint_items JSONB DEFAULT '[]',
  date_filed TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Drivers
CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  license_number TEXT NOT NULL,
  phone TEXT DEFAULT '',
  date_joined TEXT DEFAULT '',
  driving_experience_years INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alert settings
CREATE TABLE IF NOT EXISTS alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  days_before INTEGER DEFAULT 7,
  is_enabled BOOLEAN DEFAULT true
);

-- Trips
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  number_of_clients INTEGER DEFAULT 1,
  car_type TEXT DEFAULT 'sedan',
  vehicle_id TEXT REFERENCES vehicles(id),
  driver_id TEXT REFERENCES drivers(id),
  amount_paid INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'UGX',
  amount_in_ugx INTEGER DEFAULT 0,
  payment_mode TEXT DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'credit')),
  balance INTEGER DEFAULT 0,
  trip_start_date TEXT NOT NULL,
  trip_end_date TEXT NOT NULL,
  flight_arrival_time TEXT DEFAULT '',
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'ongoing', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  amount INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'UGX',
  amount_in_ugx INTEGER DEFAULT 0,
  payment_date TEXT NOT NULL,
  payment_mode TEXT DEFAULT 'cash',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_start_date ON trips(trip_start_date);
CREATE INDEX IF NOT EXISTS idx_service_records_vehicle ON service_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_vehicle ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_complaints_vehicle ON complaints(vehicle_id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: authenticated users can read all data
CREATE POLICY "authenticated_read_users" ON users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_vehicles" ON vehicles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_service_records" ON service_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_maintenance_records" ON maintenance_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_complaints" ON complaints FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_drivers" ON drivers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_alert_settings" ON alert_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_trips" ON trips FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_payments" ON payments FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies: authenticated admins can insert/update/delete all
CREATE POLICY "admin_all_users" ON users FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_vehicles" ON vehicles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update_vehicles" ON vehicles FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_vehicles" ON vehicles FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_service_records" ON service_records FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update_service_records" ON service_records FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_service_records" ON service_records FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_maintenance_records" ON maintenance_records FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update_maintenance_records" ON maintenance_records FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_maintenance_records" ON maintenance_records FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_complaints" ON complaints FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update_complaints" ON complaints FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_complaints" ON complaints FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_drivers" ON drivers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update_drivers" ON drivers FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_drivers" ON drivers FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_alert_settings" ON alert_settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update_alert_settings" ON alert_settings FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_alert_settings" ON alert_settings FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_trips" ON trips FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update_trips" ON trips FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_trips" ON trips FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_payments" ON payments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update_payments" ON payments FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_payments" ON payments FOR DELETE USING (auth.role() = 'authenticated');
