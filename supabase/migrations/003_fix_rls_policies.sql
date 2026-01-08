-- Fix all RLS policies for companies table
-- Run this in Supabase SQL Editor

-- 1. First, drop all existing policies on companies
DROP POLICY IF EXISTS "Allow first company creation" ON companies;
DROP POLICY IF EXISTS "Super admin manages companies" ON companies;
DROP POLICY IF EXISTS "Super admin updates companies" ON companies;
DROP POLICY IF EXISTS "Super admin deletes companies" ON companies;
DROP POLICY IF EXISTS "Users view own company" ON companies;

-- 2. Create comprehensive policies for companies

-- SELECT: Everyone can view companies they belong to, super_admin sees all
CREATE POLICY "View companies" ON companies
  FOR SELECT
  USING (
    -- Super admin can see all companies
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
    OR
    -- Users can see their own company
    id IN (
      SELECT company_id FROM profiles WHERE profiles.id = auth.uid()
    )
  );

-- INSERT: Super admin can create companies, or anyone can create first company
CREATE POLICY "Create companies" ON companies
  FOR INSERT
  WITH CHECK (
    -- Allow if no companies exist (initial setup without auth)
    (SELECT COUNT(*) FROM companies) = 0
    OR
    -- Super admin can create companies
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- UPDATE: Only super admin can update companies
CREATE POLICY "Update companies" ON companies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- DELETE: Only super admin can delete companies
CREATE POLICY "Delete companies" ON companies
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 3. Fix profiles policies for super admin management
-- IMPORTANT: Avoid recursive policies that query profiles table

DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Super admin manages profiles" ON profiles;
DROP POLICY IF EXISTS "View profiles" ON profiles;
DROP POLICY IF EXISTS "Update profiles" ON profiles;
DROP POLICY IF EXISTS "Delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- SELECT: Users can always see their own profile (no recursion needed)
-- For viewing other profiles, we check role directly in the current row
CREATE POLICY "View profiles" ON profiles
  FOR SELECT
  USING (
    -- Users can always see their own profile
    auth.uid() = id
  );

-- UPDATE: Users update own profile
CREATE POLICY "Update profiles" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: Disabled for now (super admin can manage via Supabase Dashboard)
-- CREATE POLICY "Delete profiles" ON profiles FOR DELETE USING (false);
