
-- Purge all accounts (cascades to profiles + user_roles via FK)
DELETE FROM auth.users;

-- Updated signup trigger: honor requested role (non-admin), first user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INT;
  requested TEXT;
  assigned_role public.app_role;
  assigned_status public.account_status;
BEGIN
  SELECT count(*) INTO user_count FROM public.profiles;
  requested := NEW.raw_user_meta_data->>'role';

  IF user_count = 0 THEN
    assigned_role := 'admin';
    assigned_status := 'approved';
  ELSE
    IF requested IN ('fleet_manager','dispatcher','safety_officer','financial_analyst') THEN
      assigned_role := requested::public.app_role;
    ELSE
      assigned_role := 'dispatcher';
    END IF;
    assigned_status := 'pending';
  END IF;

  INSERT INTO public.profiles(id, name, email, status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), NEW.email, assigned_status);
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Security warnings: add explicit INSERT + DELETE policies on profiles
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
