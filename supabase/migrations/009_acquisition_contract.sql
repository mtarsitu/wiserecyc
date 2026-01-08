-- Add location_type and contract_id columns to acquisitions table
-- This allows acquisitions to be associated with contracts for inventory tracking

-- Add location_type column with default 'curte'
ALTER TABLE acquisitions
ADD COLUMN location_type TEXT NOT NULL DEFAULT 'curte'
CHECK (location_type IN ('curte', 'contract', 'deee'));

-- Add contract_id column referencing contracts table
ALTER TABLE acquisitions
ADD COLUMN contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL;

-- Create index for faster queries by location_type
CREATE INDEX idx_acquisitions_location_type ON acquisitions(location_type);

-- Create index for faster queries by contract_id
CREATE INDEX idx_acquisitions_contract_id ON acquisitions(contract_id);
