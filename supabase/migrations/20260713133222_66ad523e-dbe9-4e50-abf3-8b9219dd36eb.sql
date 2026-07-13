
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.is_approved(UUID) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_fleet(UUID) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, authenticated, anon;
