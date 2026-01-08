-- STEP 2: Create new policies
-- Run this AFTER step 1

-- Profiles: Simple non-recursive policies
CREATE POLICY "View profiles" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Update profiles" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Companies: Allow super_admin to see all, others see own company
CREATE POLICY "View companies" ON companies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
    OR
    id IN (
      SELECT company_id FROM profiles WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Create companies" ON companies
  FOR INSERT
  WITH CHECK (
    (SELECT COUNT(*) FROM companies) = 0
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Update companies" ON companies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Delete companies" ON companies
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );
