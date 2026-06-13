DROP VIEW IF EXISTS public.store_stats;

CREATE OR REPLACE FUNCTION public.get_store_stats()
RETURNS TABLE(total_products bigint, total_customers bigint, total_orders_done bigint, total_items_sold bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT COUNT(*) FROM public.products WHERE is_active = true)::bigint,
    (SELECT COUNT(DISTINCT user_id) FROM public.orders WHERE user_id IS NOT NULL AND status = 'selesai')::bigint,
    (SELECT COUNT(*) FROM public.orders WHERE status = 'selesai')::bigint,
    (SELECT COALESCE(SUM(oi.quantity),0)::bigint
       FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id
      WHERE o.status = 'selesai');
$$;
GRANT EXECUTE ON FUNCTION public.get_store_stats() TO anon, authenticated;