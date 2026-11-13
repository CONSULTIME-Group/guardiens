-- Lot SORT5 (13/11/2026) : lecture et pilotage des sorties dans l'espace admin.
-- Demande de Jérémie du 12/11/2026 (« le reporting et pilotage de tout ça dans
-- l'admin »), cadrée dans claude/entraide-sorties-admin-pilotage-12-novembre-2026.md.
--   admin_outings_overview    : la liste des sorties et les compteurs de pilotage,
--                               en une lecture, réservée aux admins
--   admin_outing_set_hidden   : masquer ou rétablir une sortie, réservé aux admins
-- Lecture seule sur les données existantes, aucune ligne modifiée à l'application.
-- S'applique après 0148. Repère : sort5_admin_sorties.

CREATE OR REPLACE FUNCTION public.admin_outings_overview(p_limit integer DEFAULT 200) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
-- sort5_admin_sorties
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 200), 1), 500);
  v_counters jsonb;
  v_outings jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'published_total', (SELECT count(*) FROM public.outings),
    'published_30d', (SELECT count(*) FROM public.outings o WHERE o.created_at > now() - interval '30 days'),
    'upcoming_open', (SELECT count(*) FROM public.outings o
                      WHERE o.status = 'open' AND o.hidden_at IS NULL AND o.starts_at > now()),
    'with_attendee', (SELECT count(*) FROM public.outings o
                      WHERE EXISTS (SELECT 1 FROM public.outing_attendees a
                                    WHERE a.outing_id = o.id AND a.status = 'going')),
    'organizers', (SELECT count(DISTINCT o.organizer_id) FROM public.outings o),
    'cancelled', (SELECT count(*) FROM public.outings o WHERE o.status = 'cancelled'),
    'hidden', (SELECT count(*) FROM public.outings o WHERE o.hidden_at IS NOT NULL),
    'joins_total', (SELECT count(*) FROM public.outing_attendees a WHERE a.status = 'going'),
    'joins_by_source', COALESCE((SELECT jsonb_object_agg(s.source, s.n)
                                 FROM (SELECT a.source, count(*) AS n FROM public.outing_attendees a
                                       WHERE a.status = 'going' GROUP BY a.source) s), '{}'::jsonb),
    'left_total', (SELECT count(*) FROM public.outing_attendees a WHERE a.status = 'left'),
    'alerts_sent', (SELECT count(*) FROM public.outing_alert_log),
    'alerts_sent_7d', (SELECT count(*) FROM public.outing_alert_log l WHERE l.created_at > now() - interval '7 days'),
    'alerts_stopped', (SELECT count(*) FROM public.outing_alert_preferences p WHERE NOT p.enabled),
    'alerts_radius', COALESCE((SELECT jsonb_object_agg(r.radius, r.n)
                               FROM (SELECT p.radius, count(*) AS n FROM public.outing_alert_preferences p
                                     WHERE p.enabled GROUP BY p.radius) r), '{}'::jsonb),
    'reports_open', (SELECT count(*) FROM public.reports r WHERE r.target_type = 'outing' AND r.status = 'new'),
    'flags', COALESCE((SELECT jsonb_object_agg(f.key, f.enabled) FROM public.feature_flags f
                       WHERE f.key IN ('sorties', 'sorties_emails', 'sorties_alertes')), '{}'::jsonb)
  ) INTO v_counters;

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb) INTO v_outings
  FROM (
    SELECT o.id, o.slug, o.title, o.category, o.city, o.place_kind, o.starts_at, o.created_at,
           o.status, o.hidden_at, o.capacity, o.reserved,
           o.organizer_id,
           p.first_name AS organizer_first_name,
           p.last_seen_at AS organizer_last_seen_at,
           (SELECT count(*) FROM public.outing_attendees a
            WHERE a.outing_id = o.id AND a.status = 'going') AS taken,
           COALESCE((SELECT jsonb_object_agg(s.source, s.n)
                     FROM (SELECT a.source, count(*) AS n FROM public.outing_attendees a
                           WHERE a.outing_id = o.id AND a.status = 'going' GROUP BY a.source) s), '{}'::jsonb) AS sources,
           (SELECT count(*) FROM public.outing_alert_log l WHERE l.outing_id = o.id) AS alerts_sent,
           (SELECT count(DISTINCT r.reporter_id) FROM public.reports r
            WHERE r.target_type = 'outing' AND r.target_id = o.id AND r.status = 'new') AS reports_open
    FROM public.outings o
    LEFT JOIN public.profiles p ON p.id = o.organizer_id
    ORDER BY o.created_at DESC
    LIMIT v_limit
  ) x;

  RETURN jsonb_build_object('counters', v_counters, 'outings', v_outings, 'generated_at', now());
END
$fn$;

REVOKE ALL ON FUNCTION public.admin_outings_overview(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_outings_overview(integer) TO authenticated, service_role;

-- Masquer retire la sortie des listes et de sa fiche publique, sans message aux
-- inscrits. Rétablir la rend de nouveau visible. Les signalements restent à
-- traiter dans leur écran : deux signalements encore ouverts masquent de
-- nouveau la sortie au signalement suivant.
CREATE OR REPLACE FUNCTION public.admin_outing_set_hidden(p_outing uuid, p_hidden boolean) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
-- sort5_admin_sorties
DECLARE
  v_hidden_at timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE = '42501';
  END IF;
  IF p_outing IS NULL OR p_hidden IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing');
  END IF;
  PERFORM set_config('guardiens.outing_rpc', '1', true);
  UPDATE public.outings
  SET hidden_at = CASE WHEN p_hidden THEN COALESCE(hidden_at, now()) ELSE NULL END
  WHERE id = p_outing
  RETURNING hidden_at INTO v_hidden_at;
  IF NOT FOUND THEN
    PERFORM set_config('guardiens.outing_rpc', '0', true);
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  PERFORM set_config('guardiens.outing_rpc', '0', true);
  RETURN jsonb_build_object('ok', true, 'hidden', v_hidden_at IS NOT NULL);
END
$fn$;

REVOKE ALL ON FUNCTION public.admin_outing_set_hidden(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_outing_set_hidden(uuid, boolean) TO authenticated, service_role;
