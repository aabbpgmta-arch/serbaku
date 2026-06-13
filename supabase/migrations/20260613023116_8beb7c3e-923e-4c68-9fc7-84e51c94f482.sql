
CREATE POLICY "Public read product-videos" ON storage.objects FOR SELECT USING (bucket_id = 'product-videos');
CREATE POLICY "Admin insert product-videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-videos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update product-videos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-videos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete product-videos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-videos' AND public.has_role(auth.uid(), 'admin'));
