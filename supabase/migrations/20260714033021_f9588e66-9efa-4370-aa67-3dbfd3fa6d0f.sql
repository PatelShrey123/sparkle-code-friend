DROP FUNCTION IF EXISTS public.set_account_status(uuid, public.account_status);

DROP POLICY IF EXISTS "own profile update identity fields" ON public.profiles;

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE(status) ON public.profiles TO authenticated;