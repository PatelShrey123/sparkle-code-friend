CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested TEXT;
  assigned_role public.app_role;
BEGIN
  requested := NEW.raw_user_meta_data->>'role';

  IF requested IN ('fleet_manager','dispatcher','safety_officer','financial_analyst') THEN
    assigned_role := requested::public.app_role;
  ELSE
    assigned_role := 'dispatcher';
  END IF;

  INSERT INTO public.profiles(id, name, email, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email,
    'pending'
  );

  INSERT INTO public.user_roles(user_id, role)
  VALUES (NEW.id, assigned_role);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();