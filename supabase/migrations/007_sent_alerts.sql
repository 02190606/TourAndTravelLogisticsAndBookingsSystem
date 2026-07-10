-- Track which alert stages have already been emailed per user
CREATE TABLE IF NOT EXISTS sent_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_item_id TEXT NOT NULL,
  stage INTEGER NOT NULL CHECK (stage IN (1, 2)),
  acknowledged_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, alert_item_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_sent_alerts_user ON sent_alerts(user_id);

ALTER TABLE sent_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_sent_alerts" ON sent_alerts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_sent_alerts" ON sent_alerts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_sent_alerts" ON sent_alerts FOR DELETE USING (auth.role() = 'authenticated');
