ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'logistics';

UPDATE vehicles SET source = 'logistics' WHERE source IS NULL;
