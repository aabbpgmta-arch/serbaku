
-- 1) Restrict shipping-receipts SELECT to admins only
DROP POLICY IF EXISTS "Auth read shipping-receipts" ON storage.objects;
CREATE POLICY "Admin read shipping-receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'shipping-receipts' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) Lock down user_roles mutations to service_role only (defense in depth)
DROP POLICY IF EXISTS "Block client role insert" ON public.user_roles;
DROP POLICY IF EXISTS "Block client role update" ON public.user_roles;
DROP POLICY IF EXISTS "Block client role delete" ON public.user_roles;

CREATE POLICY "Block client role insert" ON public.user_roles
  AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Block client role update" ON public.user_roles
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "Block client role delete" ON public.user_roles
  AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (false);
