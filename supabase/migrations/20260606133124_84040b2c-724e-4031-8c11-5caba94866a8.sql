-- Enums
CREATE TYPE public.pro_doc_type_enum AS ENUM (
  'diploma_acaced',
  'diploma_other',
  'siret_kbis',
  'insurance_rc_pro',
  'certification',
  'other'
);

CREATE TYPE public.pro_verification_status_enum AS ENUM (
  'pending',
  'auto_approved',
  'auto_rejected',
  'needs_review',
  'approved',
  'rejected'
);

CREATE TYPE public.pro_profile_status_enum AS ENUM (
  'none',
  'pending',
  'verified',
  'rejected'
);

-- Colonnes profil Pro
ALTER TABLE public.profiles
  ADD COLUMN pro_status public.pro_profile_status_enum NOT NULL DEFAULT 'none',
  ADD COLUMN pro_specialty TEXT,
  ADD COLUMN pro_tagline TEXT,
  ADD COLUMN pro_pricing_note TEXT,
  ADD COLUMN pro_approved_at TIMESTAMPTZ,
  ADD COLUMN pro_business_name TEXT,
  ADD COLUMN pro_siret TEXT;

-- Table vérifications
CREATE TABLE public.pro_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type public.pro_doc_type_enum NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  file_size_bytes INTEGER,
  declared_business_name TEXT,
  declared_siret TEXT,
  declared_specialty TEXT,
  ai_status TEXT,
  ai_confidence NUMERIC(4,3),
  ai_analysis JSONB,
  ai_red_flags JSONB,
  ai_analyzed_at TIMESTAMPTZ,
  status public.pro_verification_status_enum NOT NULL DEFAULT 'pending',
  admin_decision TEXT,
  admin_notes TEXT,
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pro_verifications_user ON public.pro_verifications(user_id);
CREATE INDEX idx_pro_verifications_status ON public.pro_verifications(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pro_verifications TO authenticated;
GRANT ALL ON public.pro_verifications TO service_role;

ALTER TABLE public.pro_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own verifications"
  ON public.pro_verifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner can insert own verifications"
  ON public.pro_verifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can delete own pending verifications"
  ON public.pro_verifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND status IN ('pending', 'needs_review', 'auto_rejected', 'rejected'));

CREATE POLICY "Admins can update verifications"
  ON public.pro_verifications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE TRIGGER trg_pro_verifications_updated_at
BEFORE UPDATE ON public.pro_verifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger : synchronise profiles.pro_status
CREATE OR REPLACE FUNCTION public.sync_profile_pro_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_approved BOOLEAN;
  has_pending BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.pro_verifications
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND status IN ('approved', 'auto_approved')
  ) INTO has_approved;

  SELECT EXISTS(
    SELECT 1 FROM public.pro_verifications
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND status IN ('pending', 'needs_review')
  ) INTO has_pending;

  IF has_approved THEN
    UPDATE public.profiles
       SET pro_status = 'verified',
           pro_approved_at = COALESCE(pro_approved_at, now())
     WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
       AND pro_status <> 'verified';
  ELSIF has_pending THEN
    UPDATE public.profiles
       SET pro_status = 'pending',
           pro_approved_at = NULL
     WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
       AND pro_status <> 'pending';
  ELSE
    UPDATE public.profiles
       SET pro_status = 'none',
           pro_approved_at = NULL
     WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
       AND pro_status <> 'none';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sync_profile_pro_status
AFTER INSERT OR UPDATE OR DELETE ON public.pro_verifications
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_pro_status();