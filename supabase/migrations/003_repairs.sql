-- Repairs table
CREATE TABLE IF NOT EXISTS repairs (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date_of_repair DATE NOT NULL,
  issue_description TEXT NOT NULL,
  repair_description TEXT DEFAULT '',
  urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  workshop_mechanic TEXT DEFAULT '',
  cost INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_repairs_vehicle ON repairs(vehicle_id);

-- Enable RLS
ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "authenticated_read_repairs" ON repairs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_repairs" ON repairs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update_repairs" ON repairs FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_repairs" ON repairs FOR DELETE USING (auth.role() = 'authenticated');
