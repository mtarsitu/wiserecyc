-- =====================================================
-- CREARE COMPANIE ECO METAL COLECT
-- =====================================================
-- Rulează acest script în Supabase Dashboard > SQL Editor
-- =====================================================

-- PASUL 1: Creează compania
INSERT INTO public.companies (
  id,
  name,
  cui,
  reg_com,
  address,
  city,
  county,
  country,
  is_active
) VALUES (
  gen_random_uuid(),
  'ECO METAL COLECT SRL',
  '29429095',
  'J20/1100/31962/32',
  'Str. Atomistilor 1 Bl. 1 Sc. 1 Et. 4 Ap. 18 Cod 077125',
  'Magurele',
  'Ilfov',
  'Romania',
  true
);

-- Salvează ID-ul companiei pentru utilizare ulterioară
-- Poți vedea ID-ul rulând: SELECT id FROM companies WHERE name = 'ECO METAL COLECT SRL';

-- =====================================================
-- PASUL 2: Creează utilizatorii
-- =====================================================
-- IMPORTANT: Pentru a crea utilizatori cu parole în Supabase,
-- trebuie să folosești una din metodele de mai jos:
--
-- METODA 1: Supabase Dashboard (RECOMANDAT)
-- 1. Mergi la Authentication > Users
-- 2. Click "Add user" > "Create new user"
-- 3. Completează email și parolă pentru fiecare utilizator
--
-- METODA 2: Folosind funcția auth.users (necesită privilegii de service_role)
-- =====================================================

-- După ce creezi utilizatorii în Dashboard, rulează acest script
-- pentru a le seta rolurile și compania:

-- Mai întâi, găsește ID-ul companiei:
-- SELECT id FROM companies WHERE name = 'ECO METAL COLECT SRL';

-- Apoi actualizează profilurile (înlocuiește 'COMPANY_ID_HERE' cu ID-ul real):

/*
-- Admin: raduadriancatalin@yahoo.com
UPDATE public.profiles
SET
  company_id = '87ef7498-2f8c-4750-8c98-e9c96f30263e',
  role = 'admin',
  full_name = 'Adrian Radu'
WHERE email = 'raduadriancatalin@yahoo.com';

-- Operator: officeecometal@gmail.com
UPDATE public.profiles
SET
  company_id = '87ef7498-2f8c-4750-8c98-e9c96f30263e',
  role = 'operator',
  full_name = 'Oana Sandulescu'
WHERE email = 'officeecometal@gmail.com';

-- Operator: ecometalcolect2020@gmail.com
UPDATE public.profiles
SET
  company_id = '87ef7498-2f8c-4750-8c98-e9c96f30263e',
  role = 'operator',
  full_name = 'Oana Vasilescu'
WHERE email = 'ecometalcolect2020@gmail.com';

-- Operator: lesuc21@gmail.com
UPDATE public.profiles
SET
  company_id = '87ef7498-2f8c-4750-8c98-e9c96f30263e',
  role = 'operator',
  full_name = 'Iuli Lesuc'
WHERE email = 'lesuc21@gmail.com';
*/

-- =====================================================
-- SCRIPT AUTOMAT (dacă ai deja utilizatorii creați)
-- =====================================================
-- Acest script actualizează automat profilurile bazat pe email

DO $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Obține ID-ul companiei Eco Metal Colect
  SELECT id INTO v_company_id FROM public.companies WHERE name = 'ECO METAL COLECT SRL' LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Compania ECO METAL COLECT SRL nu a fost găsită!';
  END IF;

  -- Actualizează admin
  UPDATE public.profiles
  SET company_id = v_company_id, role = 'admin', full_name = 'Adrian Radu'
  WHERE email = 'raduadriancatalin@yahoo.com';

  -- Actualizează operatori
  UPDATE public.profiles
  SET company_id = v_company_id, role = 'operator', full_name = 'Oana Sandulescu'
  WHERE email = 'officeecometal@gmail.com';

  UPDATE public.profiles
  SET company_id = v_company_id, role = 'operator', full_name = 'Oana Vasilescu'
  WHERE email = 'ecometalcolect2020@gmail.com';

  UPDATE public.profiles
  SET company_id = v_company_id, role = 'operator', full_name = 'Iuli Lesuc'
  WHERE email = 'lesuc21@gmail.com';

  RAISE NOTICE 'Profilurile au fost actualizate pentru compania: %', v_company_id;
END $$;

-- =====================================================
-- VERIFICARE
-- =====================================================
-- Rulează pentru a verifica:
SELECT
  p.email,
  p.full_name,
  p.role,
  c.name as company_name
FROM public.profiles p
LEFT JOIN public.companies c ON p.company_id = c.id
WHERE p.email IN (
  'raduadriancatalin@yahoo.com',
  'officeecometal@gmail.com',
  'ecometalcolect2020@gmail.com',
  'lesuc21@gmail.com'
);
