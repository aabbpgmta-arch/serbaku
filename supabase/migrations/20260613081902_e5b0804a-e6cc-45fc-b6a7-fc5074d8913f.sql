CREATE OR REPLACE FUNCTION public.list_active_vouchers()
RETURNS TABLE(
  id uuid,
  code text,
  description text,
  discount_type text,
  discount_value numeric,
  min_subtotal numeric,
  max_discount numeric,
  starts_at timestamptz,
  expires_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id, v.code, v.description, v.discount_type::text, v.discount_value,
         v.min_subtotal, v.max_discount, v.starts_at, v.expires_at
  FROM public.vouchers v
  WHERE v.is_active = true
    AND (v.expires_at IS NULL OR v.expires_at > now())
    AND (v.usage_limit IS NULL OR v.used_count < v.usage_limit)
  ORDER BY v.expires_at NULLS LAST, v.created_at DESC
$$;

GRANT EXECUTE ON FUNCTION public.list_active_vouchers() TO anon, authenticated;