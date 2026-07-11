
-- ============================================================
-- Signals: dormant sitters, stale verifications, affinity stale
-- ============================================================

-- 1) Gardiens dormants
CREATE OR REPLACE FUNCTION public.detect_dormant_sitters()
RETURNS TABLE (
  sitter_id uuid,
  sitter_first_name text,
  sitter_email text,
  days_since_signup integer,
  profile_completion integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.first_name,
    p.email,
    EXTRACT(day FROM now() - p.created_at)::integer,
    p.profile_completion
  FROM public.profiles p
  LEFT JOIN public.applications a ON a.sitter_id = p.id
  WHERE p.role IN ('sitter', 'both')
    AND p.identity_verified = true
    AND COALESCE(p.profile_completion, 0) >= 60
    AND p.created_at < now() - interval '30 days'
  GROUP BY p.id
  HAVING COUNT(a.id) = 0;
$$;

-- 2) Vérifications d'identité stales
CREATE OR REPLACE FUNCTION public.detect_stale_verifications()
RETURNS TABLE (
  profile_id uuid,
  first_name text,
  email text,
  days_since_request integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.first_name,
    p.email,
    EXTRACT(day FROM now() - p.updated_at)::integer
  FROM public.profiles p
  WHERE p.identity_verification_status = 'pending'
    AND p.updated_at < now() - interval '7 days';
$$;

-- 3) Onboarding affinité stale (basé sur analytics_events)
CREATE OR REPLACE FUNCTION public.detect_affinity_stale()
RETURNS TABLE (
  profile_id uuid,
  first_name text,
  email text,
  hours_since_started integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH started AS (
    SELECT DISTINCT ON (user_id) user_id, created_at
    FROM public.analytics_events
    WHERE event_type = 'affinity_onboarding_started'
      AND user_id IS NOT NULL
    ORDER BY user_id, created_at DESC
  ),
  completed AS (
    SELECT DISTINCT user_id
    FROM public.analytics_events
    WHERE event_type = 'affinity_onboarding_completed'
      AND user_id IS NOT NULL
  )
  SELECT
    p.id,
    p.first_name,
    p.email,
    EXTRACT(epoch FROM now() - s.created_at)::integer / 3600
  FROM started s
  JOIN public.profiles p ON p.id = s.user_id
  LEFT JOIN completed c ON c.user_id = s.user_id
  WHERE c.user_id IS NULL
    AND s.created_at < now() - interval '24 hours';
$$;

-- ============================================================
-- Triggers auto-résolution
-- ============================================================

-- Résout dormant_sitter dès qu'une candidature est créée
CREATE OR REPLACE FUNCTION public.resolve_dormant_sitter_on_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.admin_signals
     SET resolved_at = now(),
         action_taken = COALESCE(action_taken, 'auto_resolved_application_sent')
   WHERE signal_type = 'dormant_sitter'
     AND entity_type = 'profile'
     AND entity_id = NEW.sitter_id
     AND resolved_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resolve_dormant_sitter ON public.applications;
CREATE TRIGGER trg_resolve_dormant_sitter
AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.resolve_dormant_sitter_on_application();

-- Résout stale_verification dès que le statut sort de pending
CREATE OR REPLACE FUNCTION public.resolve_stale_verification_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.identity_verification_status IS DISTINCT FROM NEW.identity_verification_status
     AND OLD.identity_verification_status = 'pending'
     AND NEW.identity_verification_status <> 'pending' THEN
    UPDATE public.admin_signals
       SET resolved_at = now(),
           action_taken = COALESCE(action_taken, 'auto_resolved_verification_updated')
     WHERE signal_type = 'stale_verification'
       AND entity_type = 'profile'
       AND entity_id = NEW.id
       AND resolved_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resolve_stale_verification ON public.profiles;
CREATE TRIGGER trg_resolve_stale_verification
AFTER UPDATE OF identity_verification_status ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.resolve_stale_verification_on_status_change();

-- Grants pour appels via edge functions (service_role a déjà tout, mais explicite)
GRANT EXECUTE ON FUNCTION public.detect_dormant_sitters() TO service_role;
GRANT EXECUTE ON FUNCTION public.detect_stale_verifications() TO service_role;
GRANT EXECUTE ON FUNCTION public.detect_affinity_stale() TO service_role;
