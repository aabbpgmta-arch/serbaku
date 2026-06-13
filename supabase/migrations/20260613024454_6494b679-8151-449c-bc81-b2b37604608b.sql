
DROP POLICY IF EXISTS "Auth upload payment-proofs" ON storage.objects;
CREATE POLICY "Auth upload payment-proofs own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND owner = auth.uid()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owner update payment-proofs" ON storage.objects;
CREATE POLICY "Owner update payment-proofs own folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND ((owner = auth.uid() AND (storage.foldername(name))[1] = auth.uid()::text)
         OR public.has_role(auth.uid(), 'admin'))
  );
