
-- Lockdown trigger fns from public callers
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.tg_set_updated_at() SET search_path = public;

-- product-images: anyone authenticated/anon can read (signed urls used in app), only admins write
CREATE POLICY "Public read product-images" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');
CREATE POLICY "Admin write product-images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update product-images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete product-images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

-- website-assets
CREATE POLICY "Public read website-assets" ON storage.objects FOR SELECT
  USING (bucket_id = 'website-assets');
CREATE POLICY "Admin write website-assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'website-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update website-assets" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'website-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete website-assets" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'website-assets' AND public.has_role(auth.uid(), 'admin'));

-- payment-proofs: customer uploads own, admin reads all
CREATE POLICY "Owner read payment-proofs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Auth upload payment-proofs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND owner = auth.uid());
CREATE POLICY "Owner update payment-proofs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'payment-proofs' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));

-- shipping-receipts: admin writes, customer reads via order ownership (handled in app via signed urls)
CREATE POLICY "Auth read shipping-receipts" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'shipping-receipts');
CREATE POLICY "Admin write shipping-receipts" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'shipping-receipts' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update shipping-receipts" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'shipping-receipts' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete shipping-receipts" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'shipping-receipts' AND public.has_role(auth.uid(), 'admin'));

-- Seed default site settings
INSERT INTO public.site_settings (key, value) VALUES
  ('brand', '{"name":"Toko Serba","logo_url":null,"favicon_url":null}'::jsonb),
  ('contact', '{"whatsapp":"6281234567890","email":"halo@tokoserba.id","address":"Indonesia","instagram":"","tiktok":"","shopee":""}'::jsonb),
  ('hero', '{"headline":"Supplier Produk Serba 35 & Serba 75","subheadline":"Modal Kecil, Untung Lebih Besar","cta_text":"Lihat Katalog","cta_link":"/katalog","image_url":null}'::jsonb),
  ('footer', '{"description":"Toko Serba — supplier grosir produk Serba 35 & Serba 75 untuk reseller di seluruh Indonesia.","copyright":"© 2026 Toko Serba"}'::jsonb),
  ('theme', '{"primary":"#D96C9F","accent":"#F8BBD9","background":"#FFF7F0","foreground":"#1F1F1F"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.homepage_sections (title, description, icon, sort_order) VALUES
  ('Harga Grosir', 'Harga supplier langsung untuk reseller dan toko serba harga.', 'tag', 1),
  ('Minimal 6 pcs', 'Sistem grosir kelipatan 6 pcs, modal kecil untung lebih besar.', 'package', 2),
  ('Cocok untuk Reseller', 'Produk siap jual ulang dengan margin menguntungkan.', 'users', 3),
  ('Stok Ready', 'Stok selalu tersedia, pengiriman cepat ke seluruh Indonesia.', 'truck', 4);

INSERT INTO public.website_categories (name, description, sort_order) VALUES
  ('Serba 35', 'Produk grosir dengan harga Serba 35 ribuan.', 1),
  ('Serba 75', 'Produk grosir dengan harga Serba 75 ribuan.', 2);
