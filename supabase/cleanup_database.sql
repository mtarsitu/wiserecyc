-- =====================================================
-- SCRIPT DE CURĂȚARE BAZĂ DE DATE
-- =====================================================
-- ATENȚIE: Acest script șterge TOATE datele din baza de date
-- cu excepția utilizatorilor (auth.users) și profilurilor (profiles)!
--
-- Datele păstrate:
--   - auth.users (conturi utilizatori cu parole)
--   - profiles (profiluri utilizatori)
--
-- Datele șterse:
--   - companies, materials, suppliers, clients
--   - contracts, transporters, employees
--   - acquisitions, acquisition_items
--   - sales, sale_items, receptions, reception_items
--   - expenses, expense_categories
--   - inventory, dismantlings, dismantling_outputs
--   - cash_registers, cash_transactions
-- =====================================================

-- Dezactivează temporar verificările de FK pentru a permite ștergerea în orice ordine
-- (Supabase/PostgreSQL nu are DISABLE FOREIGN_KEY_CHECKS ca MySQL, dar folosim TRUNCATE CASCADE)

BEGIN;

-- =====================================================
-- PASUL 1: Ștergere tabele dependente (fii)
-- =====================================================

-- Tranzacții și items
TRUNCATE TABLE public.cash_transactions CASCADE;
TRUNCATE TABLE public.reception_items CASCADE;
TRUNCATE TABLE public.receptions CASCADE;
TRUNCATE TABLE public.sale_items CASCADE;
TRUNCATE TABLE public.acquisition_items CASCADE;
TRUNCATE TABLE public.dismantling_outputs CASCADE;

-- =====================================================
-- PASUL 2: Ștergere tabele principale
-- =====================================================

TRUNCATE TABLE public.sales CASCADE;
TRUNCATE TABLE public.acquisitions CASCADE;
TRUNCATE TABLE public.dismantlings CASCADE;
TRUNCATE TABLE public.expenses CASCADE;
TRUNCATE TABLE public.inventory CASCADE;

-- =====================================================
-- PASUL 3: Ștergere tabele de configurare
-- =====================================================

TRUNCATE TABLE public.cash_registers CASCADE;
TRUNCATE TABLE public.contracts CASCADE;
TRUNCATE TABLE public.transporters CASCADE;
TRUNCATE TABLE public.employees CASCADE;
TRUNCATE TABLE public.suppliers CASCADE;
TRUNCATE TABLE public.clients CASCADE;
TRUNCATE TABLE public.expense_categories CASCADE;
TRUNCATE TABLE public.materials CASCADE;

-- =====================================================
-- PASUL 4: Ștergere companii
-- =====================================================

-- Înainte de a șterge companiile, trebuie să setăm company_id = NULL în profiles
-- pentru că profiles are FK către companies
UPDATE public.profiles SET company_id = NULL;

TRUNCATE TABLE public.companies CASCADE;

COMMIT;

-- =====================================================
-- VERIFICARE
-- =====================================================
-- Pentru a verifica că datele au fost șterse, rulați:
--
-- SELECT 'companies' as table_name, COUNT(*) as row_count FROM companies
-- UNION ALL SELECT 'materials', COUNT(*) FROM materials
-- UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers
-- UNION ALL SELECT 'clients', COUNT(*) FROM clients
-- UNION ALL SELECT 'contracts', COUNT(*) FROM contracts
-- UNION ALL SELECT 'acquisitions', COUNT(*) FROM acquisitions
-- UNION ALL SELECT 'acquisition_items', COUNT(*) FROM acquisition_items
-- UNION ALL SELECT 'sales', COUNT(*) FROM sales
-- UNION ALL SELECT 'sale_items', COUNT(*) FROM sale_items
-- UNION ALL SELECT 'expenses', COUNT(*) FROM expenses
-- UNION ALL SELECT 'profiles', COUNT(*) FROM profiles;
--
-- Rezultatul ar trebui să arate 0 pentru toate tabelele
-- cu excepția 'profiles' care va păstra utilizatorii
-- =====================================================
