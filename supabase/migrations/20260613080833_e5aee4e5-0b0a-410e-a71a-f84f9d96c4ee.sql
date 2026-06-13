
-- ============================================================
-- product_price_history
-- ============================================================
CREATE TABLE public.product_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  old_price numeric NOT NULL,
  new_price numeric NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.product_price_history TO authenticated;
GRANT ALL ON public.product_price_history TO service_role;

ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view price history"
  ON public.product_price_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins insert price history"
  ON public.product_price_history FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX idx_price_history_product ON public.product_price_history(product_id, created_at DESC);

-- ============================================================
-- Trigger: auto-log price changes on products.price
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_products_log_price_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.price IS DISTINCT FROM OLD.price THEN
    INSERT INTO public.product_price_history (product_id, old_price, new_price, changed_by)
    VALUES (NEW.id, COALESCE(OLD.price, 0), NEW.price, auth.uid());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_products_price_history ON public.products;
CREATE TRIGGER tg_products_price_history
  AFTER UPDATE OF price ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.tg_products_log_price_change();

-- ============================================================
-- activity_logs
-- ============================================================
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view activity logs"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins insert activity logs"
  ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND auth.uid() = admin_id);

CREATE INDEX idx_activity_logs_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_entity ON public.activity_logs(entity, entity_id);

-- ============================================================
-- RPC: log_admin_action (helper for client to insert with admin check)
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_admin_action(
  _action text,
  _entity text,
  _entity_id text DEFAULT NULL,
  _meta jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  INSERT INTO public.activity_logs (admin_id, action, entity, entity_id, meta)
  VALUES (auth.uid(), _action, _entity, _entity_id, COALESCE(_meta, '{}'::jsonb));
END $$;

-- ============================================================
-- RPC: get_product_price_history
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_product_price_history(_product_id uuid, _limit int DEFAULT 50)
RETURNS TABLE(id uuid, old_price numeric, new_price numeric, changed_by_name text, created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
    SELECT h.id, h.old_price, h.new_price,
      COALESCE(pr.full_name, pr.email, 'System')::text AS changed_by_name,
      h.created_at
    FROM public.product_price_history h
    LEFT JOIN public.profiles pr ON pr.id = h.changed_by
    WHERE h.product_id = _product_id
    ORDER BY h.created_at DESC
    LIMIT _limit;
END $$;
