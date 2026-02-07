-- Adaugă câmpul payment_status la tabelul sales
-- Rulează în Supabase SQL Editor

-- Adaugă coloana payment_status
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid'
  CHECK (payment_status IN ('paid', 'unpaid', 'partial'));

-- Comentariu pentru câmp
COMMENT ON COLUMN sales.payment_status IS 'Status încasare: paid (încasat complet), partial (parțial), unpaid (neîncasat)';

-- Verificare
SELECT
  column_name,
  data_type,
  column_default,
  pg_catalog.col_description(
    (SELECT oid FROM pg_catalog.pg_class WHERE relname = 'sales'),
    ordinal_position
  ) as description
FROM information_schema.columns
WHERE table_name = 'sales'
AND column_name = 'payment_status';
