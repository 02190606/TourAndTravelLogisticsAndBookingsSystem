-- Fix sent_alerts stage check to allow stage 0 (used for 14-day trip alerts)
ALTER TABLE sent_alerts DROP CONSTRAINT IF EXISTS sent_alerts_stage_check;

ALTER TABLE sent_alerts ADD CONSTRAINT sent_alerts_stage_check CHECK (stage IN (0, 1, 2, 3));
