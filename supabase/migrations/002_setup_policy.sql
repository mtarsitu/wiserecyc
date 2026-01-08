-- Allow inserting the first company when no companies exist (for initial setup)
-- This policy enables the /setup page to work without authentication

-- Drop existing restrictive policies on companies for INSERT
DROP POLICY IF EXISTS "Super admin manages companies" ON companies;

-- Recreate with additional condition for first company setup
CREATE POLICY "Allow first company creation" ON companies
  FOR INSERT
  WITH CHECK (
    -- Allow if no companies exist (initial setup)
    (SELECT COUNT(*) FROM companies) = 0
    OR
    -- Or if user is super_admin
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Super admin can update/delete companies
CREATE POLICY "Super admin updates companies" ON companies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admin deletes companies" ON companies
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Also need to allow profile update for setting up super_admin
-- Drop and recreate profile update policy
DROP POLICY IF EXISTS "Users update own profile" ON profiles;

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE
  USING (
    -- User can update their own profile
    auth.uid() = id
    OR
    -- Super admin can update any profile
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
    )
  );
