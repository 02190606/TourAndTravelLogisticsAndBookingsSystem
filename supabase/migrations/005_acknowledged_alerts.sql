-- Track acknowledged alerts per user
CREATE TABLE IF NOT EXISTS acknowledged_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_id TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, alert_id)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_acknowledged_alerts_user ON acknowledged_alerts(user_id);

-- Enable RLS
ALTER TABLE acknowledged_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "authenticated_read_acknowledged_alerts" ON acknowledged_alerts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_acknowledged_alerts" ON acknowledged_alerts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_acknowledged_alerts" ON acknowledged_alerts FOR DELETE USING (auth.role() = 'authenticated');
