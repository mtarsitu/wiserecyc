-- Remove the problematic function and use simple RLS
-- This is the simplest possible setup

-- Drop the function that may cause recursion
DROP FUNCTION IF EXISTS is_super_admin();

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "View profiles" ON profiles;
DROP POLICY IF EXISTS "Update profiles" ON profiles;

-- Simple policy: authenticated users can only see their own profile
-- Super admin will use separate queries with service role for admin functions
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
