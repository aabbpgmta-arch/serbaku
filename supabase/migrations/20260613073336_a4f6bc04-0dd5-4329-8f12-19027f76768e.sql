
-- Phase 1: Sales stats view + manual featured products

-- 1) Aggregated product sales (only completed orders)
CREATE OR REPLACE VIEW public.product_sales_stats
WITH (security_invoker = true) AS
SELECT
  oi.product_id,
  COALESCE(SUM(oi.quantity), 0)::bigint AS total_sold,
  COALESCE(SUM(oi.quantity) FILTER (WHERE o.created_at >= now() - interval '7 days'), 0)::bigint AS sold_7d,
  COALESCE(SUM(oi.quantity) FILTER (WHERE o.created_at >= now() - interval '30 days'), 0)::bigint AS sold_30d,
  MAX(o.created_at) AS last_sold_at
FROM public.order_items oi
JOIN public.orders o ON o.id = oi.order_id
WHERE o.status = 'selesai' AND oi.product_id IS NOT NULL
GROUP BY oi.product_id;

GRANT SELECT ON public.product_sales_stats TO anon, authenticated, service_role;

-- 2) Manual featured products (admin-curated slots)
CREATE TABLE IF NOT EXISTS public.manual_featured_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot text NOT NULL CHECK (slot IN ('featured','bestseller','bestseller_week','bestseller_month')),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slot, product_id)
);

CREATE INDEX IF NOT EXISTS idx_mfp_slot_pos ON public.manual_featured_products(slot, position);

GRANT SELECT ON public.manual_featured_products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.manual_featured_products TO authenticated;
GRANT ALL ON public.manual_featured_products TO service_role;

ALTER TABLE public.manual_featured_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read manual featured"
  ON public.manual_featured_products FOR SELECT
  USING (true);

CREATE POLICY "Admin manage manual featured"
  ON public.manual_featured_products FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
