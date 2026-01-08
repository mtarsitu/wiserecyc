-- Add acquisition_type column to acquisition_items table (per line, not per acquisition)
-- Types:
--   'normal' - regular item, appears on weighing ticket and reports
--   'zero' - plus/adjustment, does NOT appear on ticket, only in reports for admin (activated with Ctrl+M)
--   'director' - director item, does NOT appear on ticket, only in reports for admin (activated with Ctrl+M)

-- Create enum type for acquisition item type
DO $$ BEGIN
    CREATE TYPE acq_item_type AS ENUM ('normal', 'zero', 'director');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add acquisition_type column to acquisition_items (per line)
ALTER TABLE acquisition_items
ADD COLUMN IF NOT EXISTS acquisition_type acq_item_type DEFAULT 'normal';

-- Update existing items to be normal type
UPDATE acquisition_items SET acquisition_type = 'normal' WHERE acquisition_type IS NULL;
