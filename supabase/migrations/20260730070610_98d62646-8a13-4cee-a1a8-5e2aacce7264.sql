
-- 1) Auto-résolution des signaux dont la cause a disparu
CREATE OR REPLACE FUNCTION public.auto_resolve_admin_signals()
RETURNS TABLE(signal_type text, resolved_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT s.id, s.signal_type
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL
      AND (
        -- Document d'identité désormais renseigné
        (s.signal_type = 'identity_orphan_documents' AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = s.entity_id AND p.identity_document_url IS NOT NULL
        ))
        -- Brouillon d'annonce qui n'est plus en statut draft
        OR (s.signal_type = 'stale_draft' AND EXISTS (
          SELECT 1 FROM public.sits si
          WHERE si.id = s.entity_id AND si.status <> 'draft'
        ))
        -- Candidature qui n'est plus en attente
        OR (s.signal_type = 'pending_application' AND EXISTS (
          SELECT 1 FROM public.applications a
          WHERE a.id = s.entity_id AND a.status <> 'pending'
        ))
        -- Annonce qui a reçu au moins une candidature
        OR (s.signal_type = 'no_applications' AND EXISTS (
          SELECT 1 FROM public.applications a
          WHERE a.sit_id = s.entity_id
        ))
        -- Profil qui dispose maintenant de coordonnées
        OR (s.signal_type = 'owner_missing_coordinates' AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = s.entity_id
            AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
        ))
      )
  ), updated AS (
    UPDATE public.admin_signals s
    SET resolved_at = now(),
        action_taken = 'auto_resolved_cause_disparue'
    FROM candidates c
    WHERE s.id = c.id
    RETURNING s.signal_type
  )
  SELECT u.signal_type, COUNT(*)::integer
  FROM updated u
  GROUP BY u.signal_type;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_resolve_admin_signals() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_resolve_admin_signals() TO service_role;

-- 2) Faux positif : « fast_apply » n'est pas critique
CREATE OR REPLACE FUNCTION public.normalize_admin_signal_severity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.signal_type = 'suspicious_account'
     AND (
       NEW.metadata->>'signal' = 'fast_apply'
       OR NEW.metadata->>'detail' = 'Inscription puis candidature en moins de 2 heures'
     )
     AND NEW.severity = 'critical'
  THEN
    NEW.severity := 'warning';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_admin_signal_severity ON public.admin_signals;
CREATE TRIGGER trg_normalize_admin_signal_severity
BEFORE INSERT OR UPDATE ON public.admin_signals
FOR EACH ROW EXECUTE FUNCTION public.normalize_admin_signal_severity();
