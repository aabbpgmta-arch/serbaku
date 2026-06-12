REVOKE EXECUTE ON FUNCTION public.set_order_payment_proof(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_order_payment_proof(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_order_payment_proof(uuid, text) FROM authenticated;