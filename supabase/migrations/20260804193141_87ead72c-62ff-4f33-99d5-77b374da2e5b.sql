SET LOCAL app.allow_internal_profile_update = 'on';

CREATE OR REPLACE FUNCTION public.set_declared_pro_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  has_verification BOOLEAN;
BEGIN
  IF NEW.pro_status IN ('verified', 'pending', 'rejected') THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.pro_verifications WHERE user_id = NEW.id
  ) INTO has_verification;

  IF NEW.pro_specialty IS NOT NULL AND btrim(NEW.pro_specialty) <> '' AND NOT has_verification THEN
    NEW.pro_status := 'declared';
  ELSIF (NEW.pro_specialty IS NULL OR btrim(NEW.pro_specialty) = '') AND NEW.pro_status = 'declared' THEN
    NEW.pro_status := 'none';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_set_declared_pro_status ON public.profiles;
CREATE TRIGGER trg_set_declared_pro_status
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_declared_pro_status();

CREATE OR REPLACE FUNCTION public.sync_profile_pro_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_user UUID := COALESCE(NEW.user_id, OLD.user_id);
  has_approved BOOLEAN;
  has_pending BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.pro_verifications
    WHERE user_id = target_user AND status IN ('approved', 'auto_approved')
  ) INTO has_approved;

  SELECT EXISTS(
    SELECT 1 FROM public.pro_verifications
    WHERE user_id = target_user AND status IN ('pending', 'needs_review')
  ) INTO has_pending;

  IF has_approved THEN
    UPDATE public.profiles
       SET pro_status = 'verified',
           pro_approved_at = COALESCE(pro_approved_at, now())
     WHERE id = target_user AND pro_status <> 'verified';
  ELSIF has_pending THEN
    UPDATE public.profiles
       SET pro_status = 'pending',
           pro_approved_at = NULL
     WHERE id = target_user AND pro_status <> 'pending';
  ELSE
    UPDATE public.profiles
       SET pro_status = CASE
             WHEN pro_specialty IS NOT NULL AND btrim(pro_specialty) <> '' THEN 'declared'::public.pro_profile_status_enum
             ELSE 'none'::public.pro_profile_status_enum
           END,
           pro_approved_at = NULL
     WHERE id = target_user;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT id,
    first_name,
    city,
    avatar_url,
    bio,
    completed_sits_count,
    identity_verified,
    is_founder,
    postal_code,
    created_at,
    profile_completion,
    round(latitude::numeric, 2)::double precision AS latitude_approx,
    round(longitude::numeric, 2)::double precision AS longitude_approx,
    available_for_help,
    skill_categories,
    custom_skills,
    role,
    pro_status,
    pro_specialty,
    pro_business_name,
    pro_tagline,
    pro_pricing_note,
    last_seen_at
   FROM public.profiles
  WHERE account_status = 'active'::text AND first_name IS NOT NULL;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
GRANT ALL ON public.public_profiles TO service_role;

UPDATE public.profiles
   SET pro_status = 'declared'
 WHERE pro_specialty IS NOT NULL
   AND btrim(pro_specialty) <> ''
   AND pro_status = 'none';