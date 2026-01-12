-- =====================================================
-- MIGRATION: Drivers (Soferi)
-- =====================================================
-- Tabel pentru gestionarea soferilor:
-- - Soferi flota proprie
-- - Soferi transportatori externi
-- - Soferi furnizori
-- Un vehicul poate avea mai multi soferi asociati
-- =====================================================

-- Create drivers table
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    id_series VARCHAR(10),           -- Serie buletin (ex: RK)
    id_number VARCHAR(20),           -- Numar buletin (ex: 123456)
    phone VARCHAR(50),
    owner_type vehicle_owner_type NOT NULL DEFAULT 'own_fleet',
    transporter_id UUID REFERENCES public.transporters(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Validate owner references based on owner_type
    CONSTRAINT drivers_owner_check CHECK (
        (owner_type = 'own_fleet' AND transporter_id IS NULL AND supplier_id IS NULL) OR
        (owner_type = 'transporter' AND transporter_id IS NOT NULL AND supplier_id IS NULL) OR
        (owner_type = 'supplier' AND supplier_id IS NOT NULL AND transporter_id IS NULL)
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_drivers_company_id ON public.drivers(company_id);
CREATE INDEX IF NOT EXISTS idx_drivers_transporter_id ON public.drivers(transporter_id);
CREATE INDEX IF NOT EXISTS idx_drivers_supplier_id ON public.drivers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_drivers_owner_type ON public.drivers(owner_type);

-- Enable RLS
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for drivers
CREATE POLICY "Users can view drivers from their company"
    ON public.drivers FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert drivers for their company"
    ON public.drivers FOR INSERT
    WITH CHECK (company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update drivers from their company"
    ON public.drivers FOR UPDATE
    USING (company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete drivers from their company"
    ON public.drivers FOR DELETE
    USING (company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_drivers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS drivers_updated_at ON public.drivers;
CREATE TRIGGER drivers_updated_at
    BEFORE UPDATE ON public.drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_drivers_updated_at();

-- =====================================================
-- JUNCTION TABLE: Vehicle-Drivers (many-to-many)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.vehicle_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,  -- Sofer principal pentru acest vehicul
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint - un sofer poate fi asociat o singura data la un vehicul
    CONSTRAINT vehicle_drivers_unique UNIQUE (vehicle_id, driver_id)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_drivers_vehicle_id ON public.vehicle_drivers(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_drivers_driver_id ON public.vehicle_drivers(driver_id);

-- Enable RLS
ALTER TABLE public.vehicle_drivers ENABLE ROW LEVEL SECURITY;

-- RLS Policies (inherit from vehicles)
CREATE POLICY "Users can view vehicle_drivers from their company"
    ON public.vehicle_drivers FOR SELECT
    USING (vehicle_id IN (
        SELECT id FROM public.vehicles WHERE company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert vehicle_drivers for their company"
    ON public.vehicle_drivers FOR INSERT
    WITH CHECK (vehicle_id IN (
        SELECT id FROM public.vehicles WHERE company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can update vehicle_drivers from their company"
    ON public.vehicle_drivers FOR UPDATE
    USING (vehicle_id IN (
        SELECT id FROM public.vehicles WHERE company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can delete vehicle_drivers from their company"
    ON public.vehicle_drivers FOR DELETE
    USING (vehicle_id IN (
        SELECT id FROM public.vehicles WHERE company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    ));

-- =====================================================
-- ADD TRANSPORT LICENSE TO VEHICLES
-- =====================================================
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS has_transport_license BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS transport_license_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS transport_license_expiry DATE;

COMMENT ON COLUMN public.vehicles.has_transport_license IS 'Vehiculul are licenta de transport (pentru anexa transport)';
COMMENT ON COLUMN public.vehicles.transport_license_number IS 'Numarul licentei de transport';
COMMENT ON COLUMN public.vehicles.transport_license_expiry IS 'Data expirarii licentei de transport';

-- =====================================================
-- ADD DRIVER_ID TO ACQUISITIONS AND SALES
-- =====================================================
ALTER TABLE public.acquisitions
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_acquisitions_driver_id ON public.acquisitions(driver_id);

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_driver_id ON public.sales(driver_id);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.drivers IS 'Soferi pentru transport - flota proprie, transportatori externi, si furnizori';
COMMENT ON COLUMN public.drivers.id_series IS 'Serie buletin (ex: RK, XC)';
COMMENT ON COLUMN public.drivers.id_number IS 'Numar buletin';
COMMENT ON COLUMN public.drivers.owner_type IS 'Tip proprietar: own_fleet=flota proprie, transporter=transportator extern, supplier=furnizor';
COMMENT ON TABLE public.vehicle_drivers IS 'Relatie many-to-many intre vehicule si soferi';
COMMENT ON COLUMN public.vehicle_drivers.is_primary IS 'Indica daca soferul este soferul principal pentru acest vehicul';
