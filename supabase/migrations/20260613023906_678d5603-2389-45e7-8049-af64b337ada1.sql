
-- 1. Enum membership_tier
DO $$ BEGIN
  CREATE TYPE public.membership_tier AS ENUM ('new','grande','elite','royal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS membership_tier public.membership_tier NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS lifetime_spend numeric(14,2) NOT NULL DEFAULT 0;

-- 3. Orders columns (snapshot)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS membership_tier public.membership_tier,
  ADD COLUMN IF NOT EXISTS membership_discount numeric(12,2) NOT NULL DEFAULT 0;

-- 4. Compute tier function
CREATE OR REPLACE FUNCTION public.compute_membership_tier(_spend numeric)
RETURNS public.membership_tier
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _spend >= 5000000 THEN 'royal'::public.membership_tier
    WHEN _spend >= 2000000 THEN 'elite'::public.membership_tier
    WHEN _spend >=  500000 THEN 'grande'::public.membership_tier
    ELSE 'new'::public.membership_tier
  END;
$$;

-- 5. Trigger to keep lifetime_spend & tier in sync
CREATE OR REPLACE FUNCTION public.tg_orders_membership_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta numeric := 0;
  new_total numeric;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'selesai' AND COALESCE(OLD.status::text,'') <> 'selesai' THEN
      delta := COALESCE(NEW.subtotal,0);
    ELSIF OLD.status = 'selesai' AND NEW.status <> 'selesai' THEN
      delta := -COALESCE(OLD.subtotal,0);
    END IF;
  ELSIF TG_OP = 'INSERT' AND NEW.status = 'selesai' THEN
    delta := COALESCE(NEW.subtotal,0);
  END IF;

  IF delta <> 0 THEN
    UPDATE public.profiles
       SET lifetime_spend = GREATEST(0, lifetime_spend + delta),
           membership_tier = public.compute_membership_tier(GREATEST(0, lifetime_spend + delta)),
           updated_at = now()
     WHERE id = NEW.user_id
    RETURNING lifetime_spend INTO new_total;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_membership_sync ON public.orders;
CREATE TRIGGER trg_orders_membership_sync
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.tg_orders_membership_sync();

-- 6. Backfill existing data
UPDATE public.profiles p SET
  lifetime_spend = COALESCE(s.total, 0),
  membership_tier = public.compute_membership_tier(COALESCE(s.total, 0))
FROM (
  SELECT user_id, SUM(subtotal) AS total
  FROM public.orders
  WHERE status = 'selesai' AND user_id IS NOT NULL
  GROUP BY user_id
) s
WHERE p.id = s.user_id;
