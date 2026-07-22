ALTER TABLE sent_alerts DROP CONSTRAINT IF EXISTS sent_alerts_stage_check;

ALTER TABLE sent_alerts ADD CONSTRAINT sent_alerts_stage_check CHECK (stage IN (1, 2, 3));
