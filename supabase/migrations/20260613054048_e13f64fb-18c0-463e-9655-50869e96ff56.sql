
-- Storage policies for branding bucket (admin write, public read)
CREATE POLICY "branding_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'branding');
CREATE POLICY "branding_admin_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "branding_admin_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "branding_admin_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));
