ALTER TYPE public.sit_status ADD VALUE IF NOT EXISTS 'expired';

ALTER TABLE public.sits
  ADD COLUMN IF NOT EXISTS review_j10_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_j20_sent boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.close_orphan_applications(p_grace_hours integer DEFAULT 24)
 RETURNS TABLE(application_id uuid, sit_id uuid, sit_title text, sit_status text, sitter_id uuid, sitter_first_name text, sitter_email text, owner_first_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ids uuid[];
BEGIN
  PERFORM set_config('app.system_close', '1', true);

  SELECT array_agg(a.id) INTO v_ids
  FROM public.applications a
  JOIN public.sits s ON s.id = a.sit_id
  WHERE a.status IN ('pending'::application_status, 'viewed'::application_status, 'discussing'::application_status)
    AND s.status::text IN ('cancelled', 'archived', 'expired')
    AND s.updated_at < now() - make_interval(hours => p_grace_hours);

  IF v_ids IS NULL THEN
    PERFORM set_config('app.system_close', '', true);
    RETURN;
  END IF;

  UPDATE public.applications a
  SET status = 'cancelled'::application_status,
      updated_at = now()
  WHERE a.id = ANY(v_ids);

  PERFORM set_config('app.system_close', '', true);

  RETURN QUERY
  SELECT
    a.id,
    a.sit_id,
    s.title,
    s.status::text,
    a.sitter_id,
    sitter.first_name,
    sitter.email,
    owner.first_name
  FROM public.applications a
  JOIN public.sits s ON s.id = a.sit_id
  JOIN public.profiles sitter ON sitter.id = a.sitter_id
  JOIN public.profiles owner ON owner.id = s.user_id
  WHERE a.id = ANY(v_ids);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_cron_health()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;

  WITH crons(edge_name, expected_interval_min, label) AS (
    VALUES
      ('flush-prerender-cache', 15, 'Rafraîchissement Prerender'),
      ('consume-seo-dirty', 15, 'Consommation du flag SEO'),
      ('evaluate-journeys', 60, 'Évaluation des parcours'),
      ('auto-transition-sits', 60, 'Transitions de statut de garde'),
      ('nudge-suspicious-accounts', 240, 'Détection comptes suspects'),
      ('close-orphan-applications', 1440, 'Clôture des candidatures orphelines'),
      ('publish-stale-reviews', 1440, 'Publication des avis en attente'),
      ('auto-close-small-missions', 1440, 'Clôture des missions d''entraide'),
      ('purge-identity-documents', 1440, 'Purge des pièces d''identité'),
      ('nudge-stale-draft', 1440, 'Relance brouillons dormants'),
      ('send-sitter-daily-digest', 1440, 'Digest quotidien gardiens'),
      ('nudge-affinity-onboarding', 1440, 'Relance onboarding affinité'),
      ('nudge-owner-no-applications', 1440, 'Relance annonces sans candidature'),
      ('nudge-owner-pending-application', 1440, 'Relance candidatures en attente'),
      ('nudge-sitter-dormant', 1440, 'Relance gardiens dormants'),
      ('nudge-verification-stale', 1440, 'Relance vérifications d''identité'),
      ('send-sit-reminders', 1440, 'Rappels in-app avant/après garde'),
      ('send-rappel-j7', 1440, 'Email rappel J-7 avant garde'),
      ('send-rappel-j48', 1440, 'Email rappel J-48h avant garde'),
      ('send-avis-j1', 1440, 'Email relance avis J+1'),
      ('send-avis-j5', 1440, 'Email relance avis J+5'),
      ('send-avis-j10', 1440, 'Email relance avis J+10'),
      ('send-avis-j20', 1440, 'Email relance avis J+20'),
      ('remind-unread-messages', 1440, 'Relance messages non lus (24h)'),
      ('check-content-quality', 10080, 'Détecteur de défauts de contenu'),
      ('send-weekly-nearby-digest', 10080, 'Digest hebdo à proximité'),
      ('nudge-untapped-cities', 10080, 'Relance villes sans activité'),
      ('nudge-dormant-top-sitters', 10080, 'Relance meilleurs gardiens dormants'),
      ('nudge-repeated-cancellations', 10080, 'Détection annulations répétées'),
      ('nudge-repeated-republished-sits', 10080, 'Détection republications répétées')
  ),
  last_runs AS (
    SELECT DISTINCT ON (edge_name) edge_name, started_at, finished_at, status, error_message
    FROM public.cron_run_log ORDER BY edge_name, started_at DESC
  ),
  recent_stats AS (
    SELECT edge_name,
      COUNT(*) FILTER (WHERE started_at >= now() - interval '7 days') AS runs_7d,
      COUNT(*) FILTER (WHERE started_at >= now() - interval '7 days' AND status = 'failed') AS failed_7d
    FROM public.cron_run_log GROUP BY edge_name
  ),
  last_3 AS (
    SELECT edge_name, COUNT(*) FILTER (WHERE status = 'failed') AS failed_in_last_3
    FROM (SELECT edge_name, status,
            ROW_NUMBER() OVER (PARTITION BY edge_name ORDER BY started_at DESC) AS rn
          FROM public.cron_run_log WHERE finished_at IS NOT NULL) t
    WHERE rn <= 3 GROUP BY edge_name
  )
  SELECT jsonb_agg(jsonb_build_object(
    'edge_name', c.edge_name, 'label', c.label,
    'expected_interval_min', c.expected_interval_min,
    'last_started_at', lr.started_at, 'last_finished_at', lr.finished_at,
    'last_status', lr.status, 'last_error', lr.error_message,
    'runs_7d', COALESCE(rs.runs_7d, 0), 'failed_7d', COALESCE(rs.failed_7d, 0),
    'failed_in_last_3', COALESCE(l3.failed_in_last_3, 0),
    'never_ran', (lr.started_at IS NULL),
    'is_stale', (lr.started_at IS NULL OR lr.started_at < now() - (c.expected_interval_min * 2 || ' minutes')::interval)
  ) ORDER BY c.label) INTO result
  FROM crons c
  LEFT JOIN last_runs lr ON lr.edge_name = c.edge_name
  LEFT JOIN recent_stats rs ON rs.edge_name = c.edge_name
  LEFT JOIN last_3 l3 ON l3.edge_name = c.edge_name;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$function$;