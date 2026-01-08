-- Add new fields for weighing tickets
-- These fields are needed for professional weighing tickets (tichete de cantar)

-- Add weighing location to companies (e.g., "STUPAREI - VALCEA")
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS weighing_location TEXT;

-- Add scale name to companies (e.g., "SWS")
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS scale_name TEXT;

-- Add scale accuracy class to companies (e.g., "III")
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS scale_accuracy_class TEXT DEFAULT 'III';

-- Add new fields to acquisitions table
ALTER TABLE acquisitions
ADD COLUMN IF NOT EXISTS vehicle_number TEXT,
ADD COLUMN IF NOT EXISTS vehicle_config TEXT,
ADD COLUMN IF NOT EXISTS transporter_name TEXT,
ADD COLUMN IF NOT EXISTS delegate_name TEXT,
ADD COLUMN IF NOT EXISTS aviz_number TEXT,
ADD COLUMN IF NOT EXISTS weighing_type TEXT DEFAULT 'Statica',
ADD COLUMN IF NOT EXISTS weight_tara DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS weight_brut DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS weight_net DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS operator_name TEXT;

-- Add new fields to sales table
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS vehicle_number TEXT,
ADD COLUMN IF NOT EXISTS vehicle_config TEXT,
ADD COLUMN IF NOT EXISTS delegate_name TEXT,
ADD COLUMN IF NOT EXISTS aviz_number TEXT,
ADD COLUMN IF NOT EXISTS weighing_type TEXT DEFAULT 'Statica',
ADD COLUMN IF NOT EXISTS weight_tara DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS weight_brut DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS weight_net DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS operator_name TEXT;
