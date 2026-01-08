-- WiseRecyc Database Schema
-- Initial migration with Multi-tenancy support

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- MULTI-TENANCY: COMPANIES
-- ============================================

-- Companies (tenants)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cui TEXT,
  reg_com TEXT,                    -- Nr. Registrul Comertului
  address TEXT,
  city TEXT,
  county TEXT,
  country TEXT DEFAULT 'Romania',
  phone TEXT,
  email TEXT,
  iban TEXT,
  bank TEXT,
  environment_auth TEXT,           -- Nr. autorizatie de mediu
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- PROFILES (extends Supabase Auth)
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('super_admin', 'admin', 'operator', 'viewer')),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- REFERENCE TABLES
-- ============================================

-- Materials catalog (global - shared across companies)
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL DEFAULT 'kg',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Suppliers (per company)
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Date identificare
  name TEXT NOT NULL,
  cui TEXT,
  reg_com TEXT,                    -- Nr. Registrul Comertului

  -- Adresa sediu social
  address TEXT,
  city TEXT,
  county TEXT,
  country TEXT DEFAULT 'Romania',

  -- Adresa punct de lucru (daca difera)
  work_point_address TEXT,
  work_point_city TEXT,
  work_point_county TEXT,

  -- Contact
  phone TEXT,
  email TEXT,
  contact_person TEXT,

  -- Date bancare
  iban TEXT,
  bank TEXT,

  -- Autorizatii
  environment_auth TEXT,           -- Nr. autorizatie de mediu
  environment_auth_expiry DATE,    -- Data expirare autorizatie

  -- Tipuri furnizor
  is_contract BOOLEAN NOT NULL DEFAULT FALSE,
  is_punct_lucru BOOLEAN NOT NULL DEFAULT FALSE,
  is_deee BOOLEAN NOT NULL DEFAULT FALSE,

  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clients (per company)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Date identificare
  name TEXT NOT NULL,
  cui TEXT,
  reg_com TEXT,                    -- Nr. Registrul Comertului

  -- Adresa sediu social
  address TEXT,
  city TEXT,
  county TEXT,
  country TEXT DEFAULT 'Romania',

  -- Adresa punct de lucru (daca difera)
  work_point_address TEXT,
  work_point_city TEXT,
  work_point_county TEXT,

  -- Contact
  phone TEXT,
  email TEXT,
  contact_person TEXT,

  -- Date bancare
  iban TEXT,
  bank TEXT,

  -- Autorizatii
  environment_auth TEXT,           -- Nr. autorizatie de mediu
  environment_auth_expiry DATE,    -- Data expirare autorizatie

  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contracts/Tenders (per company)
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  contract_number TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  value DECIMAL(15, 2),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transporters (per company)
CREATE TABLE transporters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cui TEXT,
  phone TEXT,
  email TEXT,
  vehicle_number TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expense categories (per company)
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- ============================================
-- INVENTORY TABLE
-- ============================================

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  location_type TEXT NOT NULL CHECK (location_type IN ('curte', 'contract', 'deee')),
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  quantity DECIMAL(15, 3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, material_id, location_type, contract_id)
);

-- ============================================
-- ACQUISITIONS (ACHIZITII)
-- ============================================

CREATE TABLE acquisitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  environment_fund DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid', 'partial')),
  receipt_number TEXT,
  info TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE acquisition_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  acquisition_id UUID NOT NULL REFERENCES acquisitions(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  quantity DECIMAL(15, 3) NOT NULL,
  impurities_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  final_quantity DECIMAL(15, 3) NOT NULL,
  price_per_kg DECIMAL(10, 4) NOT NULL,
  line_total DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SALES (VANZARI)
-- ============================================

CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  payment_method TEXT CHECK (payment_method IN ('bank', 'cash')),
  attribution_type TEXT CHECK (attribution_type IN ('contract', 'punct_lucru', 'deee')),
  attribution_id UUID,
  transport_type TEXT CHECK (transport_type IN ('intern', 'extern')),
  transport_price DECIMAL(15, 2) DEFAULT 0,
  transporter_id UUID REFERENCES transporters(id) ON DELETE SET NULL,
  scale_number TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reception_done', 'cancelled')),
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  quantity DECIMAL(15, 3) NOT NULL,
  impurities_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  final_quantity DECIMAL(15, 3) NOT NULL,
  price_per_ton_usd DECIMAL(10, 2),
  exchange_rate DECIMAL(10, 4),
  price_per_kg_ron DECIMAL(10, 4) NOT NULL,
  line_total DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- RECEPTIONS (RECEPTII)
-- ============================================

CREATE TABLE receptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reception_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reception_id UUID NOT NULL REFERENCES receptions(id) ON DELETE CASCADE,
  sale_item_id UUID NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
  final_quantity DECIMAL(15, 3) NOT NULL,
  impurities_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  final_amount DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- EXPENSES (CHELTUIELI)
-- ============================================

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  name TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('payment', 'collection')),
  payment_method TEXT CHECK (payment_method IN ('bank', 'cash')),
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  attribution_type TEXT CHECK (attribution_type IN ('contract', 'punct_lucru', 'deee')),
  attribution_id UUID,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- DISMANTLING (DEZMEMBRARI)
-- ============================================

CREATE TABLE dismantlings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  location_type TEXT NOT NULL CHECK (location_type IN ('curte', 'contract')),
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  source_material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  source_quantity DECIMAL(15, 3) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dismantling_outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dismantling_id UUID NOT NULL REFERENCES dismantlings(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  quantity DECIMAL(15, 3) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Company indexes
CREATE INDEX idx_profiles_company ON profiles(company_id);
CREATE INDEX idx_suppliers_company ON suppliers(company_id);
CREATE INDEX idx_clients_company ON clients(company_id);
CREATE INDEX idx_contracts_company ON contracts(company_id);
CREATE INDEX idx_transporters_company ON transporters(company_id);
CREATE INDEX idx_expense_categories_company ON expense_categories(company_id);
CREATE INDEX idx_inventory_company ON inventory(company_id);
CREATE INDEX idx_acquisitions_company ON acquisitions(company_id);
CREATE INDEX idx_sales_company ON sales(company_id);
CREATE INDEX idx_expenses_company ON expenses(company_id);
CREATE INDEX idx_dismantlings_company ON dismantlings(company_id);

-- Other indexes
CREATE INDEX idx_acquisitions_date ON acquisitions(date);
CREATE INDEX idx_acquisitions_supplier ON acquisitions(supplier_id);
CREATE INDEX idx_acquisition_items_acquisition ON acquisition_items(acquisition_id);
CREATE INDEX idx_acquisition_items_material ON acquisition_items(material_id);

CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_sales_client ON sales(client_id);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_material ON sale_items(material_id);

CREATE INDEX idx_receptions_sale ON receptions(sale_id);
CREATE INDEX idx_reception_items_reception ON reception_items(reception_id);

CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_attribution ON expenses(attribution_type, attribution_id);

CREATE INDEX idx_dismantlings_date ON dismantlings(date);
CREATE INDEX idx_dismantling_outputs_dismantling ON dismantling_outputs(dismantling_id);

CREATE INDEX idx_inventory_material ON inventory(material_id);
CREATE INDEX idx_inventory_location ON inventory(location_type);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquisition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE receptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reception_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE dismantlings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dismantling_outputs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function to check if user is super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'super_admin' FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Companies: super_admin sees all, others see only their company
CREATE POLICY "Super admin sees all companies" ON companies
  FOR SELECT TO authenticated
  USING (is_super_admin() OR id = get_user_company_id());

CREATE POLICY "Super admin manages companies" ON companies
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Profiles: super_admin sees all, others see only their company
CREATE POLICY "Users see own profile and company profiles" ON profiles
  FOR SELECT TO authenticated
  USING (is_super_admin() OR id = auth.uid() OR company_id = get_user_company_id());

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR is_super_admin())
  WITH CHECK (id = auth.uid() OR is_super_admin());

-- Materials: global, all authenticated users can read
CREATE POLICY "All users can read materials" ON materials
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admin manages materials" ON materials
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Company-scoped tables: users see only their company's data
-- Suppliers
CREATE POLICY "Users see own company suppliers" ON suppliers
  FOR SELECT TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id());

CREATE POLICY "Users manage own company suppliers" ON suppliers
  FOR ALL TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id())
  WITH CHECK (is_super_admin() OR company_id = get_user_company_id());

-- Clients
CREATE POLICY "Users see own company clients" ON clients
  FOR SELECT TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id());

CREATE POLICY "Users manage own company clients" ON clients
  FOR ALL TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id())
  WITH CHECK (is_super_admin() OR company_id = get_user_company_id());

-- Contracts
CREATE POLICY "Users see own company contracts" ON contracts
  FOR SELECT TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id());

CREATE POLICY "Users manage own company contracts" ON contracts
  FOR ALL TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id())
  WITH CHECK (is_super_admin() OR company_id = get_user_company_id());

-- Transporters
CREATE POLICY "Users see own company transporters" ON transporters
  FOR SELECT TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id());

CREATE POLICY "Users manage own company transporters" ON transporters
  FOR ALL TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id())
  WITH CHECK (is_super_admin() OR company_id = get_user_company_id());

-- Expense categories
CREATE POLICY "Users see own company expense categories" ON expense_categories
  FOR SELECT TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id());

CREATE POLICY "Users manage own company expense categories" ON expense_categories
  FOR ALL TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id())
  WITH CHECK (is_super_admin() OR company_id = get_user_company_id());

-- Inventory
CREATE POLICY "Users see own company inventory" ON inventory
  FOR SELECT TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id());

CREATE POLICY "Users manage own company inventory" ON inventory
  FOR ALL TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id())
  WITH CHECK (is_super_admin() OR company_id = get_user_company_id());

-- Acquisitions
CREATE POLICY "Users see own company acquisitions" ON acquisitions
  FOR SELECT TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id());

CREATE POLICY "Users manage own company acquisitions" ON acquisitions
  FOR ALL TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id())
  WITH CHECK (is_super_admin() OR company_id = get_user_company_id());

-- Acquisition items (via acquisition)
CREATE POLICY "Users see own company acquisition items" ON acquisition_items
  FOR SELECT TO authenticated
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM acquisitions a WHERE a.id = acquisition_id AND a.company_id = get_user_company_id()
  ));

CREATE POLICY "Users manage own company acquisition items" ON acquisition_items
  FOR ALL TO authenticated
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM acquisitions a WHERE a.id = acquisition_id AND a.company_id = get_user_company_id()
  ))
  WITH CHECK (is_super_admin() OR EXISTS (
    SELECT 1 FROM acquisitions a WHERE a.id = acquisition_id AND a.company_id = get_user_company_id()
  ));

-- Sales
CREATE POLICY "Users see own company sales" ON sales
  FOR SELECT TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id());

CREATE POLICY "Users manage own company sales" ON sales
  FOR ALL TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id())
  WITH CHECK (is_super_admin() OR company_id = get_user_company_id());

-- Sale items (via sale)
CREATE POLICY "Users see own company sale items" ON sale_items
  FOR SELECT TO authenticated
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM sales s WHERE s.id = sale_id AND s.company_id = get_user_company_id()
  ));

CREATE POLICY "Users manage own company sale items" ON sale_items
  FOR ALL TO authenticated
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM sales s WHERE s.id = sale_id AND s.company_id = get_user_company_id()
  ))
  WITH CHECK (is_super_admin() OR EXISTS (
    SELECT 1 FROM sales s WHERE s.id = sale_id AND s.company_id = get_user_company_id()
  ));

-- Receptions (via sale)
CREATE POLICY "Users see own company receptions" ON receptions
  FOR SELECT TO authenticated
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM sales s WHERE s.id = sale_id AND s.company_id = get_user_company_id()
  ));

CREATE POLICY "Users manage own company receptions" ON receptions
  FOR ALL TO authenticated
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM sales s WHERE s.id = sale_id AND s.company_id = get_user_company_id()
  ))
  WITH CHECK (is_super_admin() OR EXISTS (
    SELECT 1 FROM sales s WHERE s.id = sale_id AND s.company_id = get_user_company_id()
  ));

-- Reception items (via reception -> sale)
CREATE POLICY "Users see own company reception items" ON reception_items
  FOR SELECT TO authenticated
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM receptions r
    JOIN sales s ON s.id = r.sale_id
    WHERE r.id = reception_id AND s.company_id = get_user_company_id()
  ));

CREATE POLICY "Users manage own company reception items" ON reception_items
  FOR ALL TO authenticated
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM receptions r
    JOIN sales s ON s.id = r.sale_id
    WHERE r.id = reception_id AND s.company_id = get_user_company_id()
  ))
  WITH CHECK (is_super_admin() OR EXISTS (
    SELECT 1 FROM receptions r
    JOIN sales s ON s.id = r.sale_id
    WHERE r.id = reception_id AND s.company_id = get_user_company_id()
  ));

-- Expenses
CREATE POLICY "Users see own company expenses" ON expenses
  FOR SELECT TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id());

CREATE POLICY "Users manage own company expenses" ON expenses
  FOR ALL TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id())
  WITH CHECK (is_super_admin() OR company_id = get_user_company_id());

-- Dismantlings
CREATE POLICY "Users see own company dismantlings" ON dismantlings
  FOR SELECT TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id());

CREATE POLICY "Users manage own company dismantlings" ON dismantlings
  FOR ALL TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id())
  WITH CHECK (is_super_admin() OR company_id = get_user_company_id());

-- Dismantling outputs (via dismantling)
CREATE POLICY "Users see own company dismantling outputs" ON dismantling_outputs
  FOR SELECT TO authenticated
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM dismantlings d WHERE d.id = dismantling_id AND d.company_id = get_user_company_id()
  ));

CREATE POLICY "Users manage own company dismantling outputs" ON dismantling_outputs
  FOR ALL TO authenticated
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM dismantlings d WHERE d.id = dismantling_id AND d.company_id = get_user_company_id()
  ))
  WITH CHECK (is_super_admin() OR EXISTS (
    SELECT 1 FROM dismantlings d WHERE d.id = dismantling_id AND d.company_id = get_user_company_id()
  ));

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED DATA
-- ============================================

-- Default materials (common recyclable materials)
INSERT INTO materials (name, unit) VALUES
  ('Cupru', 'kg'),
  ('Aluminiu', 'kg'),
  ('Fier', 'kg'),
  ('Otel inoxidabil', 'kg'),
  ('Zinc', 'kg'),
  ('Plumb', 'kg'),
  ('Bronz', 'kg'),
  ('Alama', 'kg'),
  ('Nichel', 'kg'),
  ('Cositor', 'kg'),
  ('Cablu cupru', 'kg'),
  ('Cablu aluminiu', 'kg'),
  ('Motoare electrice', 'kg'),
  ('Transformatoare', 'kg'),
  ('Radiatoare aluminiu', 'kg'),
  ('Radiatoare cupru', 'kg'),
  ('Baterii auto', 'kg'),
  ('Electronice (DEEE)', 'kg'),
  ('Plastic', 'kg'),
  ('Hartie/Carton', 'kg');
