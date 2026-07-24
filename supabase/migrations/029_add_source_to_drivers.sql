-- Add 'source' column to drivers table to distinguish logistics-created
-- drivers from those imported via other modules (e.g. trips).
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'logistics';

-- Back-fill existing rows so the filter 'source.eq.logistics,source.is.null' works
-- for both old and new records.
UPDATE drivers SET source = 'logistics' WHERE source IS NULL;
