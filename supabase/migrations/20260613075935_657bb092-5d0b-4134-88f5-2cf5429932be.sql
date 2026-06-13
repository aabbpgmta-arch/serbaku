
CREATE OR REPLACE FUNCTION public.admin_low_stock_products(p_threshold int DEFAULT 10, p_limit int DEFAULT 20)
RETURNS TABLE(id uuid, name text, slug text, stock int, price numeric, category text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
    SELECT p.id, p.name, p.slug, p.stock, p.price, p.category::text
    FROM public.products p
    WHERE p.is_active = true AND p.stock <= p_threshold
    ORDER BY p.stock ASC, p.name ASC
    LIMIT p_limit;
END $$;

CREATE OR REPLACE FUNCTION public.admin_idle_products(p_days int DEFAULT 60, p_limit int DEFAULT 20)
RETURNS TABLE(id uuid, name text, slug text, stock int, price numeric, category text, last_sold_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
    SELECT p.id, p.name, p.slug, p.stock, p.price, p.category::text,
      (SELECT MAX(o.created_at)
         FROM public.order_items oi
         JOIN public.orders o ON o.id = oi.order_id
        WHERE oi.product_id = p.id AND o.status = 'selesai') AS last_sold_at
    FROM public.products p
    WHERE p.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.order_items oi
        JOIN public.orders o ON o.id = oi.order_id
        WHERE oi.product_id = p.id AND o.status = 'selesai'
          AND o.created_at >= now() - (p_days || ' days')::interval
      )
    ORDER BY p.created_at ASC
    LIMIT p_limit;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_low_stock_products(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_idle_products(int, int) TO authenticated;
