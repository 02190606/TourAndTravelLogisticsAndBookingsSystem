-- Penalties table
CREATE TABLE IF NOT EXISTS penalties (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
  incident_date TEXT,
  date_issued TIMESTAMPTZ DEFAULT now(),
  amount INTEGER DEFAULT 0,
  reason TEXT DEFAULT '',
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'disputed')),
  issued_by TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_penalties_vehicle ON penalties(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_penalties_driver ON penalties(driver_id);
CREATE INDEX IF NOT EXISTS idx_penalties_status ON penalties(status);

-- Enable RLS
ALTER TABLE penalties ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "authenticated_read_penalties" ON penalties FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_penalties" ON penalties FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update_penalties" ON penalties FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_penalties" ON penalties FOR DELETE USING (auth.role() = 'authenticated');
