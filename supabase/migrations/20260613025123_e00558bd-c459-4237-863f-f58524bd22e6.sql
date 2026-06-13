
-- Products: add discount + flash sale columns
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'none' CHECK (discount_type IN ('none','percent','nominal')),
  ADD COLUMN IF NOT EXISTS discount_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flash_price numeric,
  ADD COLUMN IF NOT EXISTS flash_start_at timestamptz,
  ADD COLUMN IF NOT EXISTS flash_end_at timestamptz;

-- Orders: voucher snapshot
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS voucher_code text,
  ADD COLUMN IF NOT EXISTS voucher_discount numeric NOT NULL DEFAULT 0;

-- Vouchers table
CREATE TABLE IF NOT EXISTS public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','nominal')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  min_subtotal numeric NOT NULL DEFAULT 0,
  max_discount numeric,
  starts_at timestamptz,
  expires_at timestamptz,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vouchers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vouchers TO authenticated;
GRANT ALL ON public.vouchers TO service_role;

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active vouchers" ON public.vouchers;
CREATE POLICY "Anyone can view active vouchers"
  ON public.vouchers FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins manage vouchers" ON public.vouchers;
CREATE POLICY "Admins manage vouchers"
  ON public.vouchers FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_vouchers_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Validate voucher (returns row + computed discount for given subtotal)
CREATE OR REPLACE FUNCTION public.validate_voucher(_code text, _subtotal numeric)
RETURNS TABLE(code text, discount numeric, message text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.vouchers%ROWTYPE;
  d numeric := 0;
BEGIN
  SELECT * INTO v FROM public.vouchers WHERE LOWER(vouchers.code) = LOWER(_code) LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY SELECT _code, 0::numeric, 'Kode voucher tidak ditemukan'::text; RETURN;
  END IF;
  IF NOT v.is_active THEN
    RETURN QUERY SELECT v.code, 0::numeric, 'Voucher tidak aktif'::text; RETURN;
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
$$;

GRANT EXECUTE ON FUNCTION public.validate_voucher(text, numeric) TO anon, authenticated;

-- Increment voucher usage when order is created with a voucher
CREATE OR REPLACE FUNCTION public.tg_orders_voucher_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.voucher_code IS NOT NULL THEN
    UPDATE public.vouchers SET used_count = used_count + 1, updated_at = now()
      WHERE LOWER(code) = LOWER(NEW.voucher_code);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_voucher_usage ON public.orders;
CREATE TRIGGER trg_orders_voucher_usage
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_orders_voucher_usage();
