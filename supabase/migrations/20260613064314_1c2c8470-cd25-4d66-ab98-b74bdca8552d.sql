
-- Remove client-side INSERT policies for orders/order_items. All order creation
-- now goes through a trusted server function using service_role. This prevents
-- clients from inserting orders with tampered prices, discounts, or membership tier.
DROP POLICY IF EXISTS "Own orders insert" ON public.orders;
DROP POLICY IF EXISTS "Order items insert via order" ON public.order_items;

-- Remove hardcoded admin email from the new-user trigger. Admin role is granted
-- explicitly via a one-time manual insert (kept idempotent below) and any future
-- admin elevation should be done by an existing admin via the admin UI.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Preserve existing admin role for the initial owner account (if it already exists).
-- This is a one-time backfill, not a hardcoded rule for future signups.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE LOWER(email) = 'xavirafashion@gmail.com'
ON CONFLICT DO NOTHING;
