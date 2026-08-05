ALTER TABLE public.pro_profiles ADD COLUMN IF NOT EXISTS is_paused boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_pro_profiles_paused ON public.pro_profiles (is_paused) WHERE is_paused = false;

CREATE OR REPLACE FUNCTION public.clear_my_pro_status()
RETURNS TABLE (deleted_file_paths text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  paths text[];
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT COALESCE(array_agg(file_path), ARRAY[]::text[])
  INTO paths
  FROM public.pro_verifications
  WHERE user_id = uid
    AND status NOT IN ('approved', 'auto_approved');

  DELETE FROM public.pro_verifications
  WHERE user_id = uid
    AND status NOT IN ('approved', 'auto_approved');

  UPDATE public.profiles
  SET pro_specialty = NULL,
      pro_business_name = NULL,
      pro_siret = NULL,
      pro_tagline = NULL,
      pro_pricing_note = NULL,
      pro_status = 'none'
  WHERE id = uid;

  RETURN QUERY SELECT paths;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_my_pro_status() FROM public;
GRANT EXECUTE ON FUNCTION public.clear_my_pro_status() TO authenticated;