-- Make the deny-by-default intent explicit for security tooling.

DROP POLICY IF EXISTS "R2 confirmations: deny client access"
  ON public.r2_asset_confirmations;
CREATE POLICY "R2 confirmations: deny client access"
  ON public.r2_asset_confirmations
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
