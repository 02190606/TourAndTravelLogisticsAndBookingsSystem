-- Mileage records table
CREATE TABLE IF NOT EXISTS mileage_records (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date TEXT,
  opening_mileage INTEGER DEFAULT 0,
  closing_mileage INTEGER DEFAULT 0,
  distance_covered INTEGER DEFAULT 0,
  service_given INTEGER DEFAULT 0,
  service_due INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mileage_records_vehicle ON mileage_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_mileage_records_date ON mileage_records(date);

-- Enable RLS
ALTER TABLE mileage_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "authenticated_read_mileage_records" ON mileage_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_mileage_records" ON mileage_records FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update_mileage_records" ON mileage_records FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_mileage_records" ON mileage_records FOR DELETE USING (auth.role() = 'authenticated');
