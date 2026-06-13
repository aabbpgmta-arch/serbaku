
-- Drop legacy flash columns on products (Flash Sale dipisah total ke tabel sendiri)
ALTER TABLE public.products DROP COLUMN IF EXISTS flash_price;
ALTER TABLE public.products DROP COLUMN IF EXISTS flash_start_at;
ALTER TABLE public.products DROP COLUMN IF EXISTS flash_end_at;

-- Flash sale campaigns
CREATE TABLE public.flash_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.flash_sales TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flash_sales TO authenticated;
GRANT ALL ON public.flash_sales TO service_role;
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read flash sales" ON public.flash_sales FOR SELECT USING (true);
CREATE POLICY "Admin manage flash sales" ON public.flash_sales FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_flash_sales_updated BEFORE UPDATE ON public.flash_sales
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Items per campaign
CREATE TABLE public.flash_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flash_sale_id uuid NOT NULL REFERENCES public.flash_sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','nominal')),
  discount_value numeric NOT NULL CHECK (discount_value >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flash_sale_id, product_id)
);
GRANT SELECT ON public.flash_sale_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flash_sale_items TO authenticated;
GRANT ALL ON public.flash_sale_items TO service_role;
ALTER TABLE public.flash_sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read flash sale items" ON public.flash_sale_items FOR SELECT USING (true);
CREATE POLICY "Admin manage flash sale items" ON public.flash_sale_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_flash_sale_items_product ON public.flash_sale_items(product_id);
CREATE INDEX idx_flash_sales_window ON public.flash_sales(starts_at, ends_at) WHERE is_active = true;
