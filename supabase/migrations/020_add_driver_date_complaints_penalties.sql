DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'driver_id') THEN
    ALTER TABLE complaints ADD COLUMN driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'incident_date') THEN
    ALTER TABLE complaints ADD COLUMN incident_date TEXT;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'penalties') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'penalties' AND column_name = 'driver_id') THEN
      ALTER TABLE penalties ADD COLUMN driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'penalties' AND column_name = 'incident_date') THEN
      ALTER TABLE penalties ADD COLUMN incident_date TEXT;
    END IF;
  END IF;
END $$;
