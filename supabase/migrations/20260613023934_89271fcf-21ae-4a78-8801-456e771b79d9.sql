
REVOKE EXECUTE ON FUNCTION public.compute_membership_tier(numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_orders_membership_sync() FROM PUBLIC, anon, authenticated;
