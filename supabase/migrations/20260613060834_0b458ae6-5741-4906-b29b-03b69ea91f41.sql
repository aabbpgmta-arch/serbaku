
ALTER TABLE public.testimonials
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;
