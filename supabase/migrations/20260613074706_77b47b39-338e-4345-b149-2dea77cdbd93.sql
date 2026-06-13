
CREATE TABLE IF NOT EXISTS public.wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

GRANT SELECT, INSERT, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own wishlist" ON public.wishlists
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own wishlist" ON public.wishlists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own wishlist" ON public.wishlists
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS wishlists_user_idx ON public.wishlists(user_id);
CREATE INDEX IF NOT EXISTS wishlists_product_idx ON public.wishlists(product_id);

-- Customer also bought: prioritize same-category bestsellers,
-- fall back to global bestsellers; exclude the source product.
CREATE OR REPLACE FUNCTION public.customer_also_bought(p_product_id uuid, p_limit int DEFAULT 8)
RETURNS TABLE(product_id uuid, qty_sold bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH src AS (
    SELECT category FROM public.products WHERE id = p_product_id
  ),
  same_cat AS (
    SELECT p.id AS product_id, COALESCE(SUM(oi.quantity),0)::bigint AS qty_sold
    FROM public.products p
    LEFT JOIN public.order_items oi ON oi.product_id = p.id
    LEFT JOIN public.orders o ON o.id = oi.order_id AND o.status = 'selesai'
    WHERE p.is_active = true
      AND p.stock > 0
      AND p.id <> p_product_id
      AND p.category = (SELECT category FROM src)
    GROUP BY p.id
    ORDER BY qty_sold DESC
    LIMIT p_limit
  )
  SELECT * FROM same_cat;
$$;
