ALTER TABLE public.products ADD COLUMN IF NOT EXISTS manual_badge text;

CREATE OR REPLACE FUNCTION public.top_products_window(p_days int, p_limit int DEFAULT 8)
RETURNS TABLE(product_id uuid, qty_sold bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT oi.product_id, SUM(oi.quantity)::bigint AS qty_sold
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.status = 'selesai'
    AND o.created_at >= now() - (p_days || ' days')::interval
    AND oi.product_id IS NOT NULL
  GROUP BY oi.product_id
  ORDER BY qty_sold DESC
  LIMIT p_limit
$$;
GRANT EXECUTE ON FUNCTION public.top_products_window(int, int) TO anon, authenticated;

CREATE OR REPLACE VIEW public.store_stats AS
SELECT
  (SELECT COUNT(*) FROM public.products WHERE is_active = true)::bigint AS total_products,
  (SELECT COUNT(DISTINCT user_id) FROM public.orders WHERE user_id IS NOT NULL AND status = 'selesai')::bigint AS total_customers,
  (SELECT COUNT(*) FROM public.orders WHERE status = 'selesai')::bigint AS total_orders_done,
  (SELECT COALESCE(SUM(oi.quantity),0)::bigint
     FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id
    WHERE o.status = 'selesai') AS total_items_sold;
GRANT SELECT ON public.store_stats TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.recent_sales_ticker(p_limit int DEFAULT 12)
RETURNS TABLE(city text, qty bigint, product_name text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.city, SUM(oi.quantity)::bigint AS qty,
    (ARRAY_AGG(p.name ORDER BY oi.quantity DESC))[1] AS product_name,
    o.created_at
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  LEFT JOIN public.products p ON p.id = oi.product_id
  WHERE o.status = 'selesai' AND o.created_at >= now() - interval '30 days'
  GROUP BY o.id, o.city, o.created_at
  ORDER BY o.created_at DESC
  LIMIT p_limit
$$;
GRANT EXECUTE ON FUNCTION public.recent_sales_ticker(int) TO anon, authenticated;