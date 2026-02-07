-- Adaugă câmpuri pentru taxe și contribuții la achiziții
-- Rulează în Supabase SQL Editor

-- Pentru achiziții - tax_amount (impozit 10% de plătit la stat pentru persoane fizice)
ALTER TABLE acquisitions
ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0;

-- Pentru achiziții - is_natural_person (dacă furnizorul este persoană fizică)
ALTER TABLE acquisitions
ADD COLUMN IF NOT EXISTS is_natural_person boolean DEFAULT false;

-- Comentarii pentru câmpuri
COMMENT ON COLUMN acquisitions.tax_amount IS 'Impozit 10% de plătit la stat pentru persoane fizice (se adaugă la total_amount)';
COMMENT ON COLUMN acquisitions.is_natural_person IS 'Dacă furnizorul este persoană fizică (fără CUI sau cu CNP)';
COMMENT ON COLUMN acquisitions.environment_fund IS 'Fond de mediu 2% din valoarea achiziției (se plătește separat la stat)';

-- Verificare
SELECT
  column_name,
  data_type,
  column_default,
  pg_catalog.col_description(
    (SELECT oid FROM pg_catalog.pg_class WHERE relname = 'acquisitions'),
    ordinal_position
  ) as description
FROM information_schema.columns
WHERE table_name = 'acquisitions'
AND column_name IN ('tax_amount', 'is_natural_person', 'environment_fund');
