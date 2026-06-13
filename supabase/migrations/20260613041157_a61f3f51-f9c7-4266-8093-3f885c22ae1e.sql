DROP POLICY IF EXISTS "Anyone can view active vouchers" ON public.vouchers;

CREATE OR REPLACE FUNCTION public.validate_voucher(_code text, _subtotal numeric)
 RETURNS TABLE(code text, discount numeric, message text)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v public.vouchers%ROWTYPE;
  d numeric := 0;
BEGIN
  SELECT * INTO v FROM public.vouchers WHERE LOWER(vouchers.code) = LOWER(_code) AND is_active = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY SELECT _code, 0::numeric, 'Kode voucher tidak ditemukan'::text; RETURN;
  END IF;
  IF v.starts_at IS NOT NULL AND v.starts_at > now() THEN
    RETURN QUERY SELECT v.code, 0::numeric, 'Voucher belum berlaku'::text; RETURN;
  END IF;
  IF v.expires_at IS NOT NULL AND v.expires_at < now() THEN
    RETURN QUERY SELECT v.code, 0::numeric, 'Voucher sudah kedaluwarsa'::text; RETURN;
  END IF;
  IF v.usage_limit IS NOT NULL AND v.used_count >= v.usage_limit THEN
    RETURN QUERY SELECT v.code, 0::numeric, 'Kuota voucher habis'::text; RETURN;
  END IF;
  IF _subtotal < v.min_subtotal THEN
    RETURN QUERY SELECT v.code, 0::numeric, ('Minimum belanja Rp'||v.min_subtotal::text)::text; RETURN;
  END IF;
  IF v.discount_type = 'percent' THEN
    d := ROUND(_subtotal * v.discount_value / 100.0);
  ELSE
    d := v.discount_value;
  END IF;
  IF v.max_discount IS NOT NULL AND d > v.max_discount THEN d := v.max_discount; END IF;
  IF d > _subtotal THEN d := _subtotal; END IF;
  RETURN QUERY SELECT v.code, d, 'ok'::text;
END;
$function$;