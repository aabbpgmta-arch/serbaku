
-- ============================================================
-- 1. PRODUCTS: SKU + reserved_stock
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS reserved_stock integer NOT NULL DEFAULT 0;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_reserved_stock_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_reserved_stock_check CHECK (reserved_stock >= 0);

CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku) WHERE sku IS NOT NULL;

-- ============================================================
-- 2. ORDERS: timestamps + courier
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS shipped_courier text;

-- ============================================================
-- 3. ORDER_STATUS_HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  note text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View own order status history" ON public.order_status_history;
CREATE POLICY "View own order status history"
  ON public.order_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_history.order_id
        AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
    )
  );

CREATE INDEX IF NOT EXISTS idx_status_history_order
  ON public.order_status_history(order_id, created_at);

-- ============================================================
-- 4. STATUS TRANSITION GUARD
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_orders_validate_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  old_s text := OLD.status::text;
  new_s text := NEW.status::text;
BEGIN
  IF old_s = new_s THEN
    RETURN NEW;
  END IF;

  IF old_s = 'selesai' OR old_s = 'dibatalkan' THEN
    RAISE EXCEPTION 'Pesanan yang sudah % tidak dapat diubah', old_s;
  END IF;

  IF old_s = 'menunggu_pembayaran' AND new_s NOT IN ('diproses','dibatalkan') THEN
    RAISE EXCEPTION 'Status hanya bisa berubah ke Diproses atau Dibatalkan';
  END IF;

  IF old_s = 'diproses' AND new_s NOT IN ('dikirim','dibatalkan') THEN
    RAISE EXCEPTION 'Status hanya bisa berubah ke Dikirim atau Dibatalkan';
  END IF;

  IF old_s = 'dikirim' AND new_s NOT IN ('selesai') THEN
    RAISE EXCEPTION 'Status hanya bisa berubah ke Selesai';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_validate_status ON public.orders;
CREATE TRIGGER trg_orders_validate_status
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_orders_validate_status_transition();

-- ============================================================
-- 5. STATUS HISTORY TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_orders_log_status_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, note)
    VALUES (NEW.id, NULL, NEW.status::text, NEW.user_id, 'Pesanan dibuat');
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status::text, NEW.status::text, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_status_history_ins ON public.orders;
CREATE TRIGGER trg_orders_status_history_ins
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_orders_log_status_history();

DROP TRIGGER IF EXISTS trg_orders_status_history_upd ON public.orders;
CREATE TRIGGER trg_orders_status_history_upd
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_orders_log_status_history();

-- ============================================================
-- 6. RESERVATION ON ORDER_ITEMS INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_order_items_reserve_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o_status text;
  p_stock int;
  p_reserved int;
  p_name text;
BEGIN
  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT status::text INTO o_status FROM public.orders WHERE id = NEW.order_id;
  IF o_status IS NULL THEN RETURN NEW; END IF;

  IF o_status = 'menunggu_pembayaran' THEN
    SELECT stock, reserved_stock, name INTO p_stock, p_reserved, p_name
      FROM public.products WHERE id = NEW.product_id FOR UPDATE;

    IF (p_stock - p_reserved) < NEW.quantity THEN
      RAISE EXCEPTION 'Stok produk "%" tidak mencukupi (tersisa %)',
        p_name, GREATEST(0, p_stock - p_reserved);
    END IF;

    UPDATE public.products
      SET reserved_stock = reserved_stock + NEW.quantity
      WHERE id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_items_reserve ON public.order_items;
CREATE TRIGGER trg_order_items_reserve
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_order_items_reserve_stock();

-- ============================================================
-- 7. REPLACE STOCK HANDLER (reservation-aware)
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_orders_handle_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  it record;
  old_s text := COALESCE(OLD.status::text,'');
  new_s text := NEW.status::text;
BEGIN
  -- menunggu_pembayaran -> diproses : confirm sale, release reservation, deduct stock
  IF old_s = 'menunggu_pembayaran' AND new_s = 'diproses' AND NEW.stock_deducted = false THEN
    FOR it IN SELECT product_id, quantity FROM public.order_items
              WHERE order_id = NEW.id AND product_id IS NOT NULL LOOP
      UPDATE public.products
        SET reserved_stock = GREATEST(0, reserved_stock - it.quantity),
            stock = GREATEST(0, stock - it.quantity),
            is_active = CASE WHEN (stock - it.quantity) <= 0 THEN false ELSE is_active END
        WHERE id = it.product_id;
    END LOOP;
    NEW.stock_deducted := true;
    NEW.paid_at := COALESCE(NEW.paid_at, now());
  END IF;

  -- menunggu_pembayaran -> dibatalkan : just release reservation
  IF old_s = 'menunggu_pembayaran' AND new_s = 'dibatalkan' THEN
    FOR it IN SELECT product_id, quantity FROM public.order_items
              WHERE order_id = NEW.id AND product_id IS NOT NULL LOOP
      UPDATE public.products
        SET reserved_stock = GREATEST(0, reserved_stock - it.quantity)
        WHERE id = it.product_id;
    END LOOP;
    NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
  END IF;

  -- diproses -> dibatalkan : restore stock
  IF old_s = 'diproses' AND new_s = 'dibatalkan' AND OLD.stock_deducted = true THEN
    FOR it IN SELECT product_id, quantity FROM public.order_items
              WHERE order_id = NEW.id AND product_id IS NOT NULL LOOP
      UPDATE public.products
        SET stock = stock + it.quantity
        WHERE id = it.product_id;
    END LOOP;
    NEW.stock_deducted := false;
    NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
  END IF;

  -- diproses -> dikirim : timestamp
  IF old_s = 'diproses' AND new_s = 'dikirim' THEN
    NEW.shipped_at := COALESCE(NEW.shipped_at, now());
  END IF;

  -- dikirim -> selesai : timestamp
  IF old_s = 'dikirim' AND new_s = 'selesai' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 8. BACKFILL existing menunggu_pembayaran orders into reservation
-- ============================================================
WITH pending AS (
  SELECT oi.product_id, SUM(oi.quantity)::int AS qty
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  WHERE o.status = 'menunggu_pembayaran'
    AND oi.product_id IS NOT NULL
  GROUP BY oi.product_id
)
UPDATE public.products p
   SET reserved_stock = COALESCE(pending.qty, 0)
  FROM pending
 WHERE pending.product_id = p.id;

-- Backfill order_status_history for existing orders (one entry per order)
INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, created_at, note)
SELECT o.id, NULL, o.status::text, o.user_id, o.created_at, 'Pesanan dibuat'
FROM public.orders o
WHERE NOT EXISTS (
  SELECT 1 FROM public.order_status_history h WHERE h.order_id = o.id
);

-- Backfill paid_at / shipped_at / completed_at / cancelled_at for existing orders
UPDATE public.orders SET paid_at = COALESCE(paid_at, updated_at)
  WHERE status IN ('diproses','dikirim','selesai') AND paid_at IS NULL;
UPDATE public.orders SET shipped_at = COALESCE(shipped_at, updated_at)
  WHERE status IN ('dikirim','selesai') AND shipped_at IS NULL;
UPDATE public.orders SET completed_at = COALESCE(completed_at, updated_at)
  WHERE status = 'selesai' AND completed_at IS NULL;
UPDATE public.orders SET cancelled_at = COALESCE(cancelled_at, updated_at)
  WHERE status = 'dibatalkan' AND cancelled_at IS NULL;

-- ============================================================
-- 9. RPC: expire pesanan menunggu_pembayaran (admin only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.expire_pending_orders(_hours int DEFAULT 24)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  WITH expired AS (
    UPDATE public.orders
       SET status = 'dibatalkan'::public.order_status
     WHERE status = 'menunggu_pembayaran'
       AND created_at < now() - (_hours || ' hours')::interval
     RETURNING id
  )
  SELECT COUNT(*) INTO cnt FROM expired;
  RETURN cnt;
END;
$$;
