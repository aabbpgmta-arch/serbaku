
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_deducted boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.tg_orders_handle_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  it record;
BEGIN
  -- Deduct stock when moving INTO diproses for the first time
  IF NEW.status = 'diproses' AND COALESCE(OLD.status::text, '') <> 'diproses' AND NEW.stock_deducted = false THEN
    FOR it IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id AND product_id IS NOT NULL LOOP
      UPDATE public.products
         SET stock = stock - it.quantity,
             is_active = CASE WHEN (stock - it.quantity) <= 0 THEN false ELSE is_active END
       WHERE id = it.product_id;
    END LOOP;
    NEW.stock_deducted := true;
  END IF;

  -- Restore stock when cancelling an order whose stock was previously deducted
  IF NEW.status = 'dibatalkan' AND OLD.stock_deducted = true AND NEW.stock_deducted = true THEN
    FOR it IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id AND product_id IS NOT NULL LOOP
      UPDATE public.products
         SET stock = stock + it.quantity
       WHERE id = it.product_id;
    END LOOP;
    NEW.stock_deducted := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_stock ON public.orders;
CREATE TRIGGER trg_orders_stock
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.tg_orders_handle_stock();

-- Auto-deactivate products on direct stock edits when reaching zero
CREATE OR REPLACE FUNCTION public.tg_products_auto_deactivate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.stock <= 0 THEN
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_auto_deactivate ON public.products;
CREATE TRIGGER trg_products_auto_deactivate
BEFORE INSERT OR UPDATE OF stock ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.tg_products_auto_deactivate();
