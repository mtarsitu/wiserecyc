-- COMPLETE RESET - Simple RLS policies
-- Run this to fix loading issue

-- Drop ALL policies on companies
DROP POLICY IF EXISTS "View companies" ON companies;
DROP POLICY IF EXISTS "Create companies" ON companies;
DROP POLICY IF EXISTS "Update companies" ON companies;
DROP POLICY IF EXISTS "Delete companies" ON companies;
DROP POLICY IF EXISTS "Allow first company creation" ON companies;
DROP POLICY IF EXISTS "Super admin manages companies" ON companies;
DROP POLICY IF EXISTS "Super admin updates companies" ON companies;
DROP POLICY IF EXISTS "Super admin deletes companies" ON companies;
DROP POLICY IF EXISTS "Users view own company" ON companies;

-- Drop ALL policies on profiles
DROP POLICY IF EXISTS "View profiles" ON profiles;
DROP POLICY IF EXISTS "Update profiles" ON profiles;
DROP POLICY IF EXISTS "Delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Super admin manages profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- PROFILES: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- COMPANIES: Temporarily allow all authenticated users to view all companies
-- This breaks the recursion issue
CREATE POLICY "Authenticated users view companies" ON companies
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin creates companies" ON companies
  FOR INSERT WITH CHECK (
    (SELECT COUNT(*) FROM companies) = 0
    OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

CREATE POLICY "Super admin updates companies" ON companies
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

CREATE POLICY "Super admin deletes companies" ON companies
  FOR DELETE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );
