-- FINAL FIX - Drop everything and recreate

-- Drop ALL on profiles
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL on companies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'companies'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON companies', pol.policyname);
    END LOOP;
END $$;

-- Now create simple policies

-- PROFILES
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- COMPANIES
CREATE POLICY "companies_select" ON companies
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "companies_insert" ON companies
  FOR INSERT WITH CHECK (
    (SELECT COUNT(*) FROM companies) = 0
    OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

CREATE POLICY "companies_update" ON companies
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

CREATE POLICY "companies_delete" ON companies
  FOR DELETE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );
