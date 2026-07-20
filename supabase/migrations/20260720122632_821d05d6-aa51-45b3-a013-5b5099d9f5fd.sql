
-- 1) Trigger sensible : autoriser l'utilisateur à faire passer son statut à 'pending' uniquement
CREATE OR REPLACE FUNCTION public.prevent_profile_sensitive_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF current_setting('app.allow_internal_profile_update', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Escape hatch : le membre peut soumettre son dossier (statut -> 'pending')
  -- depuis un état non décidé. Les statuts 'verified' / 'rejected' / 'needs_review'
  -- restent réservés à l'équipe (verify-identity, admin-manage-identity-verification).
  IF NEW.identity_verification_status IS DISTINCT FROM OLD.identity_verification_status
     AND NEW.identity_verification_status = 'pending'
     AND COALESCE(OLD.identity_verification_status, 'not_submitted') IN ('not_submitted', 'pending', 'rejected')
     AND NEW.identity_verified IS NOT DISTINCT FROM OLD.identity_verified
  THEN
    -- transition autorisée, on ne bloque pas
    NULL;
  ELSIF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.identity_verified IS DISTINCT FROM OLD.identity_verified
     OR NEW.identity_verification_status IS DISTINCT FROM OLD.identity_verification_status
     OR NEW.account_status IS DISTINCT FROM OLD.account_status
     OR NEW.is_founder IS DISTINCT FROM OLD.is_founder
     OR NEW.pro_status IS DISTINCT FROM OLD.pro_status
     OR NEW.pro_approved_at IS DISTINCT FROM OLD.pro_approved_at
     OR NEW.suspended_at IS DISTINCT FROM OLD.suspended_at
     OR NEW.suspended_by IS DISTINCT FROM OLD.suspended_by
     OR NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason
     OR NEW.suspended_until IS DISTINCT FROM OLD.suspended_until
     OR NEW.boosted_until IS DISTINCT FROM OLD.boosted_until
     OR NEW.free_months_credit IS DISTINCT FROM OLD.free_months_credit
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
     OR NEW.completed_sits_count IS DISTINCT FROM OLD.completed_sits_count
     OR NEW.cancellation_count IS DISTINCT FROM OLD.cancellation_count
     OR NEW.cancellations_as_proprio IS DISTINCT FROM OLD.cancellations_as_proprio
     OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
  THEN
    RAISE EXCEPTION 'Modification interdite d''un champ sensible du profil';
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Backfill des 9 orphelins : raccroche les documents en stockage au profil
--    et passe le statut à 'pending' pour qu'ils réapparaissent dans la file admin.
DO $$
BEGIN
  PERFORM set_config('app.allow_internal_profile_update', 'on', true);

  UPDATE public.profiles p
  SET
    identity_document_url = COALESCE(p.identity_document_url, (
      SELECT o.name FROM storage.objects o
      WHERE o.bucket_id = 'identity-documents'
        AND (storage.foldername(o.name))[1]::uuid = p.id
        AND o.name LIKE '%identity-document%'
      ORDER BY o.created_at DESC
      LIMIT 1
    )),
    identity_selfie_url = COALESCE(p.identity_selfie_url, (
      SELECT o.name FROM storage.objects o
      WHERE o.bucket_id = 'identity-documents'
        AND (storage.foldername(o.name))[1]::uuid = p.id
        AND o.name LIKE '%identity-selfie%'
      ORDER BY o.created_at DESC
      LIMIT 1
    )),
    identity_verification_status = 'pending'
  WHERE p.identity_verified = false
    AND p.identity_verification_status = 'not_submitted'
    AND EXISTS (
      SELECT 1 FROM storage.objects o
      WHERE o.bucket_id = 'identity-documents'
        AND (storage.foldername(o.name))[1]::uuid = p.id
    );
END;
$$;

-- 3) Détection récurrente des orphelins (documents en stockage sans dossier ouvert)
CREATE OR REPLACE FUNCTION public.detect_identity_orphan_documents()
RETURNS TABLE(profile_id uuid, first_name text, email text, oldest_upload timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    p.first_name,
    p.email,
    (SELECT MIN(o.created_at) FROM storage.objects o
      WHERE o.bucket_id = 'identity-documents'
        AND (storage.foldername(o.name))[1]::uuid = p.id) AS oldest_upload
  FROM public.profiles p
  WHERE p.identity_verified = false
    AND p.identity_verification_status IN ('not_submitted', 'rejected')
    AND EXISTS (
      SELECT 1 FROM storage.objects o
      WHERE o.bucket_id = 'identity-documents'
        AND (storage.foldername(o.name))[1]::uuid = p.id
    );
$function$;

-- 4) Documents à purger (décision > 30 jours)
CREATE OR REPLACE FUNCTION public.list_identity_documents_to_purge(_retention_days integer DEFAULT 30)
RETURNS TABLE(user_id uuid, object_name text, decided_at timestamptz, decision text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH last_decision AS (
    SELECT
      user_id,
      MAX(created_at) FILTER (WHERE result IN ('verified','rejected')) AS decided_at,
      (ARRAY_AGG(result ORDER BY created_at DESC) FILTER (WHERE result IN ('verified','rejected')))[1] AS decision
    FROM public.identity_verification_logs
    GROUP BY user_id
  )
  SELECT
    ld.user_id,
    o.name,
    ld.decided_at,
    ld.decision
  FROM last_decision ld
  JOIN storage.objects o
    ON o.bucket_id = 'identity-documents'
   AND (storage.foldername(o.name))[1]::uuid = ld.user_id
  JOIN public.profiles p ON p.id = ld.user_id
  WHERE ld.decided_at IS NOT NULL
    AND ld.decided_at < now() - make_interval(days => _retention_days)
    -- filet de sécurité : on ne purge que les dossiers effectivement décidés
    AND p.identity_verification_status IN ('verified','rejected');
$function$;

REVOKE ALL ON FUNCTION public.detect_identity_orphan_documents() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_identity_documents_to_purge(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.detect_identity_orphan_documents() TO service_role;
GRANT EXECUTE ON FUNCTION public.list_identity_documents_to_purge(integer) TO service_role;
