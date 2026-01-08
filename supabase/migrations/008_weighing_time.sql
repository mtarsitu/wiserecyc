-- Migration: Add weighing_time to acquisitions and sales
-- Purpose: Store the exact time of weighing for ticket generation

-- Add weighing_time column to acquisitions
ALTER TABLE acquisitions
ADD COLUMN IF NOT EXISTS weighing_time TIME DEFAULT CURRENT_TIME;

-- Add weighing_time column to sales
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS weighing_time TIME DEFAULT CURRENT_TIME;

-- Update existing records to have a default time based on created_at
UPDATE acquisitions
SET weighing_time = created_at::time
WHERE weighing_time IS NULL;

UPDATE sales
SET weighing_time = created_at::time
WHERE weighing_time IS NULL;
