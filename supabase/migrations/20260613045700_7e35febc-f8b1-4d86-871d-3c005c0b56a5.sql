
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS landing_path text;

CREATE INDEX IF NOT EXISTS idx_orders_utm_source ON public.orders (utm_source);
CREATE INDEX IF NOT EXISTS idx_orders_utm_created ON public.orders (created_at DESC) WHERE utm_source IS NOT NULL;
