-- Drop overly permissive customer update policy
DROP POLICY IF EXISTS "Own orders update payment proof" ON public.orders;

-- Secure function: customer can only set payment_proof_url on their own pending order
CREATE OR REPLACE FUNCTION public.set_order_payment_proof(_order_id uuid, _url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.orders
     SET payment_proof_url = _url,
         updated_at = now()
   WHERE id = _order_id
     AND user_id = auth.uid()
     AND status = 'menunggu_pembayaran';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or not eligible for payment proof upload';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_order_payment_proof(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_order_payment_proof(uuid, text) TO authenticated;