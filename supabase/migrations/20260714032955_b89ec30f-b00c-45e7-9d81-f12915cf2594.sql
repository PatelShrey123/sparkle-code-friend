-- Admin-only account status change function
CREATE OR REPLACE FUNCTION public.set_account_status(_user_id uuid, _status public.account_status)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change account approval status';
  END IF;

  UPDATE public.profiles
  SET status = _status
  WHERE id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_account_status(uuid, public.account_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_account_status(uuid, public.account_status) TO authenticated;

-- Normal users may update only profile identity fields directly, never approval status.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE(name, email) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "own profile update basic" ON public.profiles;
CREATE POLICY "own profile update identity fields"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Tighten data visibility by approved role instead of any approved account.
DROP POLICY IF EXISTS "approved read vehicles" ON public.vehicles;
CREATE POLICY "role read vehicles"
  ON public.vehicles FOR SELECT TO authenticated
  USING (
    public.is_approved(auth.uid()) AND (
      public.can_manage_fleet(auth.uid()) OR
      public.has_role(auth.uid(), 'dispatcher') OR
      public.has_role(auth.uid(), 'financial_analyst')
    )
  );

DROP POLICY IF EXISTS "approved read drivers" ON public.drivers;
CREATE POLICY "role read drivers"
  ON public.drivers FOR SELECT TO authenticated
  USING (
    public.is_approved(auth.uid()) AND (
      public.can_manage_fleet(auth.uid()) OR
      public.has_role(auth.uid(), 'dispatcher') OR
      public.has_role(auth.uid(), 'safety_officer') OR
      public.has_role(auth.uid(), 'financial_analyst')
    )
  );

DROP POLICY IF EXISTS "approved read trips" ON public.trips;
CREATE POLICY "role read trips"
  ON public.trips FOR SELECT TO authenticated
  USING (
    public.is_approved(auth.uid()) AND (
      public.can_manage_fleet(auth.uid()) OR
      public.has_role(auth.uid(), 'dispatcher') OR
      public.has_role(auth.uid(), 'financial_analyst')
    )
  );

DROP POLICY IF EXISTS "approved read maint" ON public.maintenance_logs;
CREATE POLICY "role read maintenance"
  ON public.maintenance_logs FOR SELECT TO authenticated
  USING (
    public.is_approved(auth.uid()) AND (
      public.can_manage_fleet(auth.uid()) OR
      public.has_role(auth.uid(), 'safety_officer') OR
      public.has_role(auth.uid(), 'financial_analyst')
    )
  );

DROP POLICY IF EXISTS "approved read fuel" ON public.fuel_logs;
CREATE POLICY "role read fuel"
  ON public.fuel_logs FOR SELECT TO authenticated
  USING (
    public.is_approved(auth.uid()) AND (
      public.can_manage_fleet(auth.uid()) OR
      public.has_role(auth.uid(), 'financial_analyst')
    )
  );

DROP POLICY IF EXISTS "approved read exp" ON public.expenses;
CREATE POLICY "role read expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (
    public.is_approved(auth.uid()) AND (
      public.can_manage_fleet(auth.uid()) OR
      public.has_role(auth.uid(), 'financial_analyst')
    )
  );