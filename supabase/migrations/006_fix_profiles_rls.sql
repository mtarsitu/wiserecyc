-- Fix profiles RLS to allow super_admin to see all profiles
-- without causing recursion

-- First, create a function to check if user is super_admin
-- This function runs with SECURITY DEFINER so it bypasses RLS
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing policies
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "View profiles" ON profiles;
DROP POLICY IF EXISTS "Update profiles" ON profiles;

-- Create new policies using the function
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR is_super_admin()
  );

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
