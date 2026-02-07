-- Adaugă câmpul goes_to_accounting la acquisitions și sales
-- Rulează în Supabase SQL Editor

-- Pentru achiziții
ALTER TABLE acquisitions 
ADD COLUMN IF NOT EXISTS goes_to_accounting boolean DEFAULT true;

-- Pentru vânzări  
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS goes_to_accounting boolean DEFAULT true;

-- Verificare
SELECT 
  'acquisitions' as table_name,
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'acquisitions' AND column_name = 'goes_to_accounting'
UNION ALL
SELECT 
  'sales' as table_name,
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'sales' AND column_name = 'goes_to_accounting';
