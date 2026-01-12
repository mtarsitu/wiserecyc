-- =====================================================
-- MIGRATION: Vehicles - UPDATE EXISTING TABLE
-- =====================================================
-- Actualizează tabela vehicles existentă cu:
-- - owner_type enum în loc de is_own_fleet boolean
-- - supplier_id pentru furnizori cu mașini proprii
-- =====================================================

-- 1. Create enum for vehicle ownership type
DO $$ BEGIN
    CREATE TYPE vehicle_owner_type AS ENUM ('own_fleet', 'transporter', 'supplier');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add new columns to existing vehicles table
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS owner_type vehicle_owner_type DEFAULT 'own_fleet',
ADD COLUMN IF NOT EXISTS supplier_id UUID;

-- 2.5 Add FK constraint for supplier_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'vehicles_supplier_id_fkey'
    ) THEN
        ALTER TABLE public.vehicles
        ADD CONSTRAINT vehicles_supplier_id_fkey
        FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Migrate data from is_own_fleet to owner_type
UPDATE public.vehicles
SET owner_type = CASE
    WHEN is_own_fleet = true THEN 'own_fleet'::vehicle_owner_type
    WHEN transporter_id IS NOT NULL THEN 'transporter'::vehicle_owner_type
    ELSE 'own_fleet'::vehicle_owner_type
END
WHERE owner_type IS NULL OR owner_type = 'own_fleet';

-- 4. Make owner_type NOT NULL after migration
ALTER TABLE public.vehicles
ALTER COLUMN owner_type SET NOT NULL;

-- 5. Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_vehicles_supplier_id ON public.vehicles(supplier_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_type ON public.vehicles(owner_type);

-- =====================================================
-- ADAUGĂ CÂMPURI TRANSPORT LA ACHIZIȚII
-- =====================================================
ALTER TABLE public.acquisitions
ADD COLUMN IF NOT EXISTS transport_type VARCHAR(20) DEFAULT 'intern',
ADD COLUMN IF NOT EXISTS transport_price DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS transporter_id UUID,
ADD COLUMN IF NOT EXISTS vehicle_id UUID;

-- Add FK constraint for vehicle_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'acquisitions_vehicle_id_fkey'
    ) THEN
        ALTER TABLE public.acquisitions
        ADD CONSTRAINT acquisitions_vehicle_id_fkey
        FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Note: driver_id column and FK constraint are added in 015_drivers.sql after drivers table is created

-- Indexes
CREATE INDEX IF NOT EXISTS idx_acquisitions_vehicle_id ON public.acquisitions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_acquisitions_transporter_id ON public.acquisitions(transporter_id);

-- =====================================================
-- ADAUGĂ vehicle_id LA SALES
-- =====================================================
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS vehicle_id UUID;

-- Add FK constraint for vehicle_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'sales_vehicle_id_fkey'
    ) THEN
        ALTER TABLE public.sales
        ADD CONSTRAINT sales_vehicle_id_fkey
        FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Note: driver_id column and FK constraint are added in 015_drivers.sql after drivers table is created

CREATE INDEX IF NOT EXISTS idx_sales_vehicle_id ON public.sales(vehicle_id);

-- =====================================================
-- COMENTARII
-- =====================================================
COMMENT ON COLUMN public.vehicles.owner_type IS 'Tip proprietar: own_fleet=flotă proprie, transporter=transportator extern, supplier=furnizor cu mașină proprie';
COMMENT ON COLUMN public.vehicles.supplier_id IS 'Referință la furnizor (doar pentru owner_type=supplier)';
COMMENT ON COLUMN public.acquisitions.transport_price IS 'Costul transportului pentru această achiziție';
COMMENT ON COLUMN public.acquisitions.vehicle_id IS 'Vehiculul folosit pentru transport';
