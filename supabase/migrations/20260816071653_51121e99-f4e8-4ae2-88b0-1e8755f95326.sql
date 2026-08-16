-- Correctif délivrabilité : le taux affiché était sent/attempts (les reports
-- deferred et les abandons comptaient comme des non-délivrances). La vraie
-- délivrabilité est delivered_at renseigné / sent. L'attrition de pipeline
-- (abandoned + cancelled) est comptée à part sous un libellé distinct.
-- Ajout aussi : expiration des signaux notification_delivery_failed (503)
-- qui ne se refermaient jamais une fois l'incident terminé.

-- 1) Taux par gabarit, version corrigée. DROP requis : le type de retour change.
DROP FUNCTION IF EXISTS public.email_delivery_rate_by_template(integer);

CREATE FUNCTION public.email_delivery_rate_by_template(p_days integer DEFAULT 7)
RETURNS TABLE(
  template_name text,
  attempts bigint,
  sent bigint,
  delivered bigint,
  deferred bigint,
  abandoned bigint,
  cancelled bigint,
  failed bigint,
  delivery_rate numeric,
  abandon_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH latest AS (
    SELECT DISTINCT ON (l.message_id)
      l.message_id, l.template_name AS tpl, l.status, l.delivered_at
    FROM public.email_send_log l
    WHERE l.message_id IS NOT NULL
      -- Borne basse alignée sur EMAIL_TRACKING_START (22/07/2026) : avant la
      -- mise en service du webhook, aucun delivered_at n'existe et le taux
      -- serait faussé.
      AND l.created_at >= GREATEST(now() - make_interval(days => p_days), '2026-07-22T00:00:00Z'::timestamptz)
    ORDER BY l.message_id, l.created_at DESC
  )
  SELECT
    latest.tpl,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE latest.status = 'sent')::bigint,
    COUNT(*) FILTER (WHERE latest.delivered_at IS NOT NULL)::bigint,
    COUNT(*) FILTER (WHERE latest.status = 'deferred')::bigint,
    COUNT(*) FILTER (WHERE latest.status = 'abandoned')::bigint,
    COUNT(*) FILTER (WHERE latest.status = 'cancelled')::bigint,
    COUNT(*) FILTER (WHERE latest.status IN ('dlq', 'failed', 'bounced'))::bigint,
    -- Délivrabilité réelle : remise confirmée par le webhook parmi les envois partis.
    ROUND(100.0 * COUNT(*) FILTER (WHERE latest.delivered_at IS NOT NULL) / NULLIF(COUNT(*) FILTER (WHERE latest.status = 'sent'), 0), 1),
    -- Taux d'abandon avant envoi : messages qui ne partent jamais.
    ROUND(100.0 * (COUNT(*) FILTER (WHERE latest.status = 'abandoned') + COUNT(*) FILTER (WHERE latest.status = 'cancelled')) / NULLIF(COUNT(*), 0), 1)
  FROM latest
  GROUP BY latest.tpl
  ORDER BY 9 ASC NULLS LAST;
$function$;

GRANT EXECUTE ON FUNCTION public.email_delivery_rate_by_template(integer) TO service_role;

-- 2) Détection : seuil 70 sur la délivrabilité réelle, exclusions auth,
--    échantillon minimum sur le dénominateur, signal d'attrition distinct.
CREATE OR REPLACE FUNCTION public.detect_low_email_delivery()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inserted integer := 0;
  v_abandon integer := 0;
BEGIN
  -- Les gabarits non instrumentés (auth) ne reçoivent aucun événement
  -- webhook : delivered_at y est toujours NULL. Exclus pour ne pas générer
  -- de faux critiques (cf UNINSTRUMENTED_TEMPLATES côté front).
  WITH bad AS (
    SELECT r.* FROM public.email_delivery_rate_by_template(7) r
    WHERE r.attempts >= 20
      AND r.sent >= 10
      AND r.template_name <> ALL (ARRAY['signup','magiclink','recovery','invite','email_change','reauthentication','auth_emails'])
      AND COALESCE(r.delivery_rate, 0) < 70
  ), fresh AS (
    SELECT b.* FROM bad b
    WHERE NOT EXISTS (
      SELECT 1 FROM public.admin_signals a
      WHERE a.signal_type = 'email_delivery_low'
        AND a.resolved_at IS NULL
        AND a.metadata->>'template_name' = b.template_name
    )
  ), ins AS (
    INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
    SELECT
      'email_delivery_low',
      CASE WHEN f.delivery_rate < 50 THEN 'critical' ELSE 'warning' END,
      'content',
      md5('email_delivery_low:' || f.template_name)::uuid,
      jsonb_build_object(
        'template_name', f.template_name,
        'attempts', f.attempts,
        'sent', f.sent,
        'delivered', f.delivered,
        'failed', f.failed,
        'delivery_rate', f.delivery_rate,
        'metric_label', 'délivrabilité (delivered/sent)',
        'window_days', 7,
        'threshold', 70
      )
    FROM fresh f
    RETURNING 1
  )
  SELECT COUNT(*)::integer INTO v_inserted FROM ins;

  -- Attrition de pipeline : part des messages qui ne partent jamais
  -- (abandoned + cancelled). Signal distinct, libellé distinct, jamais
  -- critique : ce n'est pas un problème d'inbox.
  WITH bad AS (
    SELECT r.* FROM public.email_delivery_rate_by_template(7) r
    WHERE r.attempts >= 20
      AND COALESCE(r.abandon_rate, 0) > 50
  ), fresh AS (
    SELECT b.* FROM bad b
    WHERE NOT EXISTS (
      SELECT 1 FROM public.admin_signals a
      WHERE a.signal_type = 'email_abandon_high'
        AND a.resolved_at IS NULL
        AND a.metadata->>'template_name' = b.template_name
    )
  ), ins AS (
    INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
    SELECT
      'email_abandon_high',
      'warning',
      'content',
      md5('email_abandon_high:' || f.template_name)::uuid,
      jsonb_build_object(
        'template_name', f.template_name,
        'attempts', f.attempts,
        'sent', f.sent,
        'deferred', f.deferred,
        'abandoned', f.abandoned,
        'cancelled', f.cancelled,
        'abandon_rate', f.abandon_rate,
        'metric_label', 'taux d''abandon avant envoi',
        'window_days', 7,
        'threshold', 50
      )
    FROM fresh f
    RETURNING 1
  )
  SELECT COUNT(*)::integer INTO v_abandon FROM ins;

  -- Auto-résolution symétrique : le signal se referme dès que la cause
  -- disparaît (taux repassé au-dessus du seuil ou volume retombé).
  UPDATE public.admin_signals a
  SET resolved_at = now(), action_taken = 'auto_resolved_delivery_recovered'
  WHERE a.signal_type = 'email_delivery_low'
    AND a.resolved_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.email_delivery_rate_by_template(7) r
      WHERE r.template_name = a.metadata->>'template_name'
        AND r.attempts >= 20
        AND r.sent >= 10
        AND r.template_name <> ALL (ARRAY['signup','magiclink','recovery','invite','email_change','reauthentication','auth_emails'])
        AND COALESCE(r.delivery_rate, 0) < 70
    );

  UPDATE public.admin_signals a
  SET resolved_at = now(), action_taken = 'auto_resolved_abandon_recovered'
  WHERE a.signal_type = 'email_abandon_high'
    AND a.resolved_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.email_delivery_rate_by_template(7) r
      WHERE r.template_name = a.metadata->>'template_name'
        AND r.attempts >= 20
        AND COALESCE(r.abandon_rate, 0) > 50
    );

  RETURN v_inserted + v_abandon;
END;
$function$;

-- 3) Expiration des signaux d'échec de livraison : un incident 503 terminé
--    ne doit pas rester ouvert indéfiniment. La trace permanente reste dans
--    email_send_log ; le signal est une alerte actionnable, pas une archive.
--    Si la panne récidive, un signal neuf se rouvre immédiatement.
CREATE OR REPLACE FUNCTION public.auto_resolve_admin_signals()
 RETURNS TABLE(signal_type text, resolved_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT s.id, s.signal_type, 'auto_resolved_cause_disparue'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL
      AND (
        (s.signal_type = 'identity_orphan_documents' AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = s.entity_id AND p.identity_document_url IS NOT NULL
        ))
        OR (s.signal_type = 'stale_draft' AND EXISTS (
          SELECT 1 FROM public.sits si
          WHERE si.id = s.entity_id AND si.status <> 'draft'
        ))
        OR (s.signal_type = 'pending_application' AND EXISTS (
          SELECT 1 FROM public.applications a
          WHERE a.id = s.entity_id AND a.status <> 'pending'
        ))
        OR (s.signal_type = 'no_applications' AND EXISTS (
          SELECT 1 FROM public.applications a
          WHERE a.sit_id = s.entity_id
        ))
        OR (s.signal_type = 'owner_missing_coordinates' AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = s.entity_id
            AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
        ))
      )
  ), expired AS (
    SELECT s.id, s.signal_type, 'auto_resolved_expire'::text AS reason
    FROM public.admin_signals s
    WHERE s.resolved_at IS NULL
      AND (
        (s.signal_type = 'notification_delivery_failed'
          AND s.detected_at < now() - interval '3 days')
        OR (s.signal_type = 'notification_delivery_failed_burst'
          AND s.detected_at < now() - interval '2 days')
      )
  ), updated AS (
    UPDATE public.admin_signals s
    SET resolved_at = now(), action_taken = c.reason
    FROM (SELECT * FROM candidates UNION ALL SELECT * FROM expired) c
    WHERE s.id = c.id
    RETURNING s.signal_type
  )
  SELECT u.signal_type, COUNT(*)::integer
  FROM updated u
  GROUP BY u.signal_type;
END;
$$;

-- 4) Réconciliation immédiate : referme les signaux email_delivery_low
--    calculés sur l'ancienne formule et les signaux 503 devenus stales.
SELECT public.detect_low_email_delivery();
SELECT public.auto_resolve_admin_signals();