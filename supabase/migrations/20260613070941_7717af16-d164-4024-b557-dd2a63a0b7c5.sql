DROP POLICY IF EXISTS "Own profile update" ON public.profiles;

REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE UPDATE (email, full_name, whatsapp, address, city, province, postal_code, updated_at) ON public.profiles FROM authenticated;
GRANT ALL ON public.profiles TO service_role;