-- STEP 1: Drop all existing policies
-- Run this FIRST

DROP POLICY IF EXISTS "View companies" ON companies;
DROP POLICY IF EXISTS "Create companies" ON companies;
DROP POLICY IF EXISTS "Update companies" ON companies;
DROP POLICY IF EXISTS "Delete companies" ON companies;
DROP POLICY IF EXISTS "Allow first company creation" ON companies;
DROP POLICY IF EXISTS "Super admin manages companies" ON companies;
DROP POLICY IF EXISTS "Super admin updates companies" ON companies;
DROP POLICY IF EXISTS "Super admin deletes companies" ON companies;
DROP POLICY IF EXISTS "Users view own company" ON companies;

DROP POLICY IF EXISTS "View profiles" ON profiles;
DROP POLICY IF EXISTS "Update profiles" ON profiles;
DROP POLICY IF EXISTS "Delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Super admin manages profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
