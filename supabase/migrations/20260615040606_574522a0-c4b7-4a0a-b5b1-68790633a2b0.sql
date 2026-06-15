
-- 1) Default 'orders' settings (only insert if missing)
INSERT INTO public.site_settings (key, value)
VALUES ('orders', jsonb_build_object(
  'payment_expire_hours', 24,
  'auto_expire_enabled', true,
  'wa_templates', jsonb_build_object(
    'diproses',  'Halo {nama} 👋\n\nPembayaran pesanan *{nomor}* sudah kami terima. Pesanan Anda sedang kami *PROSES* untuk dipacking. Terima kasih 🙏',
    'dikirim',   'Halo {nama} 👋\n\nPesanan *{nomor}* sudah kami *KIRIM* via {kurir}. No. resi: *{resi}*. Mohon ditunggu ya 🚚',
    'selesai',   'Halo {nama} 👋\n\nTerima kasih, pesanan *{nomor}* telah *SELESAI*. Semoga berkenan kembali belanja di toko kami ❤️',
    'dibatalkan','Halo {nama} 🙏\n\nMohon maaf pesanan *{nomor}* telah *DIBATALKAN*. Jika ini keliru, silakan balas pesan ini.'
  )
))
ON CONFLICT (key) DO NOTHING;

-- 2) Internal expirer (no admin check; only callable by superuser/postgres in cron)
CREATE OR REPLACE FUNCTION public.cron_expire_pending_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  cfg jsonb;
  hours int := 24;
  enabled boolean := true;
  cnt int := 0;
BEGIN
  SELECT value INTO cfg FROM public.site_settings WHERE key = 'orders';
  IF cfg IS NOT NULL THEN
    hours := COALESCE((cfg->>'payment_expire_hours')::int, 24);
    enabled := COALESCE((cfg->>'auto_expire_enabled')::boolean, true);
  END IF;
  IF NOT enabled OR hours <= 0 THEN
    RETURN 0;
  END IF;

  WITH expired AS (
    UPDATE public.orders
       SET status = 'dibatalkan'::public.order_status
     WHERE status = 'menunggu_pembayaran'
       AND created_at < now() - (hours || ' hours')::interval
     RETURNING id
  )
  SELECT COUNT(*) INTO cnt FROM expired;
  RETURN cnt;
END;
$fn$;

-- Only DB owner/cron can execute (no role grants)
REVOKE ALL ON FUNCTION public.cron_expire_pending_orders() FROM PUBLIC;

-- 3) Ensure pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 4) Schedule (idempotent: unschedule if exists then schedule)
DO $$
BEGIN
  PERFORM cron.unschedule('serbaku-expire-pending-orders');
EXCEPTION WHEN OTHERS THEN
  -- ignore if not exists
  NULL;
END $$;

SELECT cron.schedule(
  'serbaku-expire-pending-orders',
  '*/15 * * * *',
  $$SELECT public.cron_expire_pending_orders();$$
);
