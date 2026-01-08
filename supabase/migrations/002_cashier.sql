-- ============================================
-- CASHIER MODULE - Cash Registers & Transactions
-- ============================================

-- Helper function for updated_at (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cash register types
CREATE TYPE cash_register_type AS ENUM ('cash', 'bank');

-- Transaction types
CREATE TYPE cash_transaction_type AS ENUM ('income', 'expense');

-- Source types for transactions
CREATE TYPE transaction_source_type AS ENUM ('manual', 'acquisition', 'sale', 'expense');

-- ============================================
-- CASH REGISTERS TABLE
-- ============================================
CREATE TABLE cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type cash_register_type NOT NULL DEFAULT 'cash',
    initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cash_registers_company ON cash_registers(company_id);
CREATE INDEX idx_cash_registers_type ON cash_registers(type);

-- RLS
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cash registers from their company"
    ON cash_registers FOR SELECT
    USING (
        is_super_admin() OR
        company_id = get_user_company_id()
    );

CREATE POLICY "Users can insert cash registers for their company"
    ON cash_registers FOR INSERT
    WITH CHECK (
        is_super_admin() OR
        company_id = get_user_company_id()
    );

CREATE POLICY "Users can update cash registers from their company"
    ON cash_registers FOR UPDATE
    USING (
        is_super_admin() OR
        company_id = get_user_company_id()
    );

CREATE POLICY "Users can delete cash registers from their company"
    ON cash_registers FOR DELETE
    USING (
        is_super_admin() OR
        company_id = get_user_company_id()
    );

-- Updated at trigger
CREATE TRIGGER update_cash_registers_updated_at
    BEFORE UPDATE ON cash_registers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CASH TRANSACTIONS TABLE
-- ============================================
CREATE TABLE cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type cash_transaction_type NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    source_type transaction_source_type NOT NULL DEFAULT 'manual',
    source_id UUID,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cash_transactions_company ON cash_transactions(company_id);
CREATE INDEX idx_cash_transactions_register ON cash_transactions(cash_register_id);
CREATE INDEX idx_cash_transactions_date ON cash_transactions(date);
CREATE INDEX idx_cash_transactions_source ON cash_transactions(source_type, source_id);

-- RLS
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transactions from their company"
    ON cash_transactions FOR SELECT
    USING (
        is_super_admin() OR
        company_id = get_user_company_id()
    );

CREATE POLICY "Users can insert transactions for their company"
    ON cash_transactions FOR INSERT
    WITH CHECK (
        is_super_admin() OR
        company_id = get_user_company_id()
    );

CREATE POLICY "Users can update transactions from their company"
    ON cash_transactions FOR UPDATE
    USING (
        is_super_admin() OR
        company_id = get_user_company_id()
    );

CREATE POLICY "Users can delete transactions from their company"
    ON cash_transactions FOR DELETE
    USING (
        is_super_admin() OR
        company_id = get_user_company_id()
    );

-- ============================================
-- HELPER FUNCTION: Calculate balance for a cash register up to a date
-- ============================================
CREATE OR REPLACE FUNCTION get_cash_register_balance(
    p_cash_register_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC AS $$
DECLARE
    v_initial_balance NUMERIC;
    v_income NUMERIC;
    v_expense NUMERIC;
BEGIN
    -- Get initial balance
    SELECT initial_balance INTO v_initial_balance
    FROM cash_registers
    WHERE id = p_cash_register_id;

    -- Calculate total income up to date
    SELECT COALESCE(SUM(amount), 0) INTO v_income
    FROM cash_transactions
    WHERE cash_register_id = p_cash_register_id
      AND date <= p_date
      AND type = 'income';

    -- Calculate total expense up to date
    SELECT COALESCE(SUM(amount), 0) INTO v_expense
    FROM cash_transactions
    WHERE cash_register_id = p_cash_register_id
      AND date <= p_date
      AND type = 'expense';

    RETURN v_initial_balance + v_income - v_expense;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VIEW: Cash register balances with daily summary
-- ============================================
CREATE OR REPLACE VIEW cash_register_daily_summary AS
SELECT
    cr.id AS cash_register_id,
    cr.company_id,
    cr.name,
    cr.type,
    cr.initial_balance,
    cr.is_active,
    CURRENT_DATE AS date,
    get_cash_register_balance(cr.id, (CURRENT_DATE - INTERVAL '1 day')::DATE) AS opening_balance,
    COALESCE(
        (SELECT SUM(amount) FROM cash_transactions
         WHERE cash_register_id = cr.id AND date = CURRENT_DATE AND type = 'income'),
        0
    ) AS daily_income,
    COALESCE(
        (SELECT SUM(amount) FROM cash_transactions
         WHERE cash_register_id = cr.id AND date = CURRENT_DATE AND type = 'expense'),
        0
    ) AS daily_expense,
    get_cash_register_balance(cr.id, CURRENT_DATE) AS closing_balance
FROM cash_registers cr
WHERE cr.is_active = true;
