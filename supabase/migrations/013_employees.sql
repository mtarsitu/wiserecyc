-- ============================================
-- EMPLOYEES (SALARIATI)
-- ============================================

-- Employees table (per company)
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Personal info
  full_name TEXT NOT NULL,
  cnp TEXT,                          -- CNP (optional for privacy)
  phone TEXT,
  email TEXT,
  address TEXT,

  -- Employment info
  position TEXT,                     -- Functia (operator, sofer, etc.)
  hire_date DATE,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add employee_id to expenses table for salary/advance tracking
ALTER TABLE expenses ADD COLUMN employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Index for company lookup
CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_expenses_employee ON expenses(employee_id);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees
CREATE POLICY "Users see own company employees" ON employees
  FOR SELECT TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id());

CREATE POLICY "Users manage own company employees" ON employees
  FOR ALL TO authenticated
  USING (is_super_admin() OR company_id = get_user_company_id())
  WITH CHECK (is_super_admin() OR company_id = get_user_company_id());

-- Trigger for updated_at
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
