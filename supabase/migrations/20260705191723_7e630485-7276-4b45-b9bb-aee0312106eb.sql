
ALTER TABLE public.pro_profiles
  ADD COLUMN IF NOT EXISTS siret_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS siret_verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

DO $$ BEGIN
  CREATE TYPE public.pro_pricing_tier AS ENUM ('standard', 'verified');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.pro_profiles
  ADD COLUMN IF NOT EXISTS pricing_tier public.pro_pricing_tier NOT NULL DEFAULT 'standard';

CREATE OR REPLACE FUNCTION public.sync_pricing_tier_from_siret_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.siret_verified = true AND (TG_OP = 'INSERT' OR OLD.siret_verified IS DISTINCT FROM true) THEN
    NEW.pricing_tier := 'verified';
    NEW.siret_verified_at := COALESCE(NEW.siret_verified_at, now());
  ELSIF NEW.siret_verified = false AND (TG_OP = 'UPDATE' AND OLD.siret_verified = true) THEN
    NEW.pricing_tier := 'standard';
    NEW.siret_verified_at := NULL;
    NEW.siret_verified_by := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_pricing_tier ON public.pro_profiles;
CREATE TRIGGER trg_sync_pricing_tier
BEFORE INSERT OR UPDATE OF siret_verified ON public.pro_profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_pricing_tier_from_siret_verified();

-- Aligner les lignes existantes
UPDATE public.pro_profiles
SET pricing_tier = 'verified',
    siret_verified_at = COALESCE(siret_verified_at, now())
WHERE siret_verified = true AND pricing_tier <> 'verified';
