-- A1 : unification du découpage des rôles (polyvalents comptés une seule fois,
-- libellés explicitement) entre le snapshot IA et les cartes KPI de /admin.
-- A2 : "gardes en cours" = gardes confirmées, même définition que les cartes KPI.
CREATE OR REPLACE FUNCTION public.admin_dashboard_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  affinity_since timestamptz;
  signals_active boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin')
     AND COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT applies_since INTO affinity_since
  FROM public.feature_flags WHERE key = 'mandatory_affinity_onboarding';

  SELECT COALESCE(enabled, false) INTO signals_active
  FROM public.feature_flags WHERE key = 'admin_signals_active';

  SELECT jsonb_build_object(
    'signals', CASE WHEN COALESCE(signals_active, false) THEN COALESCE((
      SELECT jsonb_agg(row_to_json(s) ORDER BY
        CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
        detected_at DESC)
      FROM (
        SELECT * FROM public.admin_signals
        WHERE resolved_at IS NULL AND severity <> 'info'
        LIMIT 20
      ) s
    ), '[]'::jsonb) ELSE '[]'::jsonb END,
    'kpis', jsonb_build_object(
      'total_users', (SELECT COUNT(*) FROM public.profiles),
      'owners', (SELECT COUNT(*) FROM public.profiles WHERE role = 'owner'),
      'sitters', (SELECT COUNT(*) FROM public.profiles WHERE role = 'sitter'),
      'both', (SELECT COUNT(*) FROM public.profiles WHERE role = 'both'),
      'new_this_week', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= now() - interval '7 days'),
      'active_listings', (SELECT COUNT(*) FROM public.sits WHERE status = 'published'),
      'ongoing_sits', (SELECT COUNT(*) FROM public.sits WHERE status = 'confirmed'),
      'reviews_count', (SELECT COUNT(*) FROM public.reviews WHERE moderation_status = 'valide' OR published = true),
      'reviews_avg', COALESCE((SELECT AVG(overall_rating)::numeric(3,2) FROM public.reviews WHERE moderation_status = 'valide' OR published = true), 0)
    ),
    'recent_activity', COALESCE((
      SELECT jsonb_agg(row_to_json(r))
      FROM (
        SELECT 'signup' AS type, id, created_at, first_name AS label, role
        FROM public.profiles
        ORDER BY created_at DESC LIMIT 10
      ) r
    ), '[]'::jsonb),
    'seo', jsonb_build_object(
      'articles_published', (SELECT COUNT(*) FROM public.articles WHERE published = true),
      'city_pages_indexable', (SELECT COUNT(*) FROM public.seo_city_pages WHERE published = true AND (noindex IS NULL OR noindex = false)),
      'sitemap_dirty', (SELECT COUNT(*) FROM public.articles WHERE seo_dirty_at IS NOT NULL)
    ),
    'affinity', jsonb_build_object(
      'onboarding_flag_active', (SELECT enabled FROM public.feature_flags WHERE key = 'mandatory_affinity_onboarding'),
      'concerned_signups', CASE
        WHEN affinity_since IS NULL THEN 0
        ELSE (SELECT COUNT(*) FROM public.profiles WHERE created_at >= affinity_since)
      END
    ),
    'signals_active', COALESCE(signals_active, false),
    'generated_at', now()
  ) INTO result;

  RETURN result;
END;
$function$;

-- B1 : age_minutes dérivé de cron_run_log (la même table que le ratio d'échecs).
-- B2 : état calculé par cron. La périodicité attendue existe déjà dans la liste
-- ci-dessous (expected_interval_min) ; la fenêtre de fraîcheur reprend la
-- convention existante de 2x la périodicité (ancien champ is_stale).
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
      ('notify-sitters-on-publish', 15, 'Alerte gardiens à la publication'),
      ('evaluate-journeys', 60, 'Évaluation des parcours'),
      ('auto-transition-sits', 60, 'Transitions de statut de garde'),
      ('send-mission-nudges', 60, 'Relances missions d''entraide'),
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
      ('nudge-owner-unconfirmed-sit', 1440, 'Relance annonces non confirmées'),
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
      ('send-mutual-aid-weekly-digest', 10080, 'Digest hebdo entraide'),
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
    'age_minutes', CASE WHEN lr.started_at IS NULL THEN NULL
                        ELSE GREATEST(0, EXTRACT(EPOCH FROM (now() - lr.started_at)) / 60)::int END,
    'runs_7d', COALESCE(rs.runs_7d, 0), 'failed_7d', COALESCE(rs.failed_7d, 0),
    'failed_in_last_3', COALESCE(l3.failed_in_last_3, 0),
    'state', CASE
      WHEN lr.started_at IS NULL
           OR lr.started_at < now() - (c.expected_interval_min * 2 || ' minutes')::interval
        THEN 'critical'
      WHEN COALESCE(rs.failed_7d, 0) >= 1 THEN 'degraded'
      ELSE 'ok'
    END
  ) ORDER BY CASE
      WHEN lr.started_at IS NULL
           OR lr.started_at < now() - (c.expected_interval_min * 2 || ' minutes')::interval
        THEN 0
      WHEN COALESCE(rs.failed_7d, 0) >= 1 THEN 1
      ELSE 2
    END, c.label) INTO result
  FROM crons c
  LEFT JOIN last_runs lr ON lr.edge_name = c.edge_name
  LEFT JOIN recent_stats rs ON rs.edge_name = c.edge_name
  LEFT JOIN last_3 l3 ON l3.edge_name = c.edge_name;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$function$;