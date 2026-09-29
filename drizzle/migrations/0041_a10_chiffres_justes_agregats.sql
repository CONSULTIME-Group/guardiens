-- Lot A10, chiffres justes : fonctions d'agrégat en lecture seule, réservées aux admins.
-- Aucune ligne existante réécrite. Aucune policy SEC1 modifiée.
-- Retour arrière : DROP FUNCTION des fonctions admin_a10_* et admin_sit_view_paths,
-- puis recréer les quatre fonctions de vues d'annonce depuis leurs définitions précédentes.

CREATE OR REPLACE FUNCTION public.admin_sit_view_paths(p_sit_id uuid)
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT ARRAY['/sits/' || p_sit_id::text, '/annonces/' || p_sit_id::text]
    || CASE WHEN s.slug IS NULL THEN ARRAY[]::text[] ELSE ARRAY['/sits/' || s.slug, '/annonces/' || s.slug] END
  FROM (SELECT p_sit_id AS id) x LEFT JOIN public.sits s ON s.id = x.id;
$$;
REVOKE ALL ON FUNCTION public.admin_sit_view_paths(uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.admin_get_listings_stats(p_sit_ids uuid[])
 RETURNS TABLE(sit_id uuid, view_count bigint, unique_view_count bigint, public_view_count bigint, member_view_count bigint, unique_member_view_count bigint, message_count bigint, conversation_count bigint, application_count bigint, last_view_at timestamp with time zone)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;
  RETURN QUERY
  WITH sids AS (SELECT u.id AS id, public.admin_sit_view_paths(u.id) AS paths FROM unnest(p_sit_ids) AS u(id)),
  ev AS (
    SELECT s.id AS event_sit_id, e.user_id, e.created_at
    FROM sids s JOIN public.analytics_events e
      ON e.event_type = 'page_view' AND e.source = ANY(s.paths)
  )
  SELECT
    s.id,
    COUNT(ev.created_at)::bigint,
    COUNT(DISTINCT ev.user_id)::bigint,
    COUNT(*) FILTER (WHERE ev.created_at IS NOT NULL AND ev.user_id IS NULL)::bigint,
    COUNT(*) FILTER (WHERE ev.user_id IS NOT NULL)::bigint,
    COUNT(DISTINCT ev.user_id) FILTER (WHERE ev.user_id IS NOT NULL)::bigint,
    (SELECT COUNT(*) FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id
       WHERE c.sit_id = s.id AND COALESCE(m.is_system, false) = false)::bigint,
    (SELECT COUNT(*) FROM public.conversations c WHERE c.sit_id = s.id)::bigint,
    (SELECT COUNT(*) FROM public.applications app
       WHERE app.sit_id = s.id AND app.status NOT IN ('rejected', 'cancelled'))::bigint,
    MAX(ev.created_at)
  FROM sids s LEFT JOIN ev ON ev.event_sit_id = s.id
  GROUP BY s.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_listing_traffic_sources(p_sit_id uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(referrer_host text, hits bigint, last_hit_at timestamp with time zone)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;
  RETURN QUERY
  SELECT
    CASE WHEN coalesce(ae.metadata->>'referrer', '') = '' THEN '(direct)'
      ELSE coalesce(nullif(regexp_replace(ae.metadata->>'referrer', '^https?://([^/]+).*$', '\1'), ''), ae.metadata->>'referrer')
    END,
    count(*)::bigint, max(ae.created_at)
  FROM public.analytics_events ae
  WHERE ae.event_type = 'page_view' AND ae.source = ANY(public.admin_sit_view_paths(p_sit_id))
  GROUP BY 1
  ORDER BY count(*) DESC, max(ae.created_at) DESC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_sits_stats(p_sit_ids uuid[])
 RETURNS TABLE(sit_id uuid, view_count bigint, message_count bigint, conversation_count bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;
  RETURN QUERY
  WITH ids AS (SELECT unnest(p_sit_ids) AS sid)
  SELECT ids.sid,
    (SELECT count(*)::bigint FROM public.analytics_events e
       WHERE e.event_type = 'page_view' AND e.source = ANY(public.admin_sit_view_paths(ids.sid))),
    (SELECT count(*)::bigint FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id
       WHERE c.sit_id = ids.sid AND coalesce(m.is_system, false) = false),
    (SELECT count(*)::bigint FROM public.conversations c WHERE c.sit_id = ids.sid)
  FROM ids;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_sit_stats(p_sit_id uuid)
 RETURNS TABLE(view_count bigint, message_count bigint, conversation_count bigint)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;
  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.analytics_events e
       WHERE e.event_type = 'page_view' AND e.source = ANY(public.admin_sit_view_paths(p_sit_id)))::bigint,
    (SELECT count(*) FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id
       WHERE c.sit_id = p_sit_id AND coalesce(m.is_system, false) = false)::bigint,
    (SELECT count(*) FROM public.conversations WHERE sit_id = p_sit_id)::bigint;
END;
$function$;

-- Compteurs d'événements Alma par type, avec personnes uniques 7 et 30 jours toujours fixes.
CREATE OR REPLACE FUNCTION public.admin_a10_alma_bubble_stats(p_since timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Accès admin requis'; END IF;
  SELECT jsonb_build_object(
    'unique_7d', (SELECT count(DISTINCT user_id) FROM analytics_events
       WHERE event_type LIKE 'alma\_%' AND event_type ~ '_(bubble_)?seen$' AND created_at >= now() - interval '7 days'),
    'unique_30d', (SELECT count(DISTINCT user_id) FROM analytics_events
       WHERE event_type LIKE 'alma\_%' AND event_type ~ '_(bubble_)?seen$' AND created_at >= now() - interval '30 days'),
    'by_type', coalesce((SELECT jsonb_agg(jsonb_build_object('event_type', event_type, 'n', n, 'last_at', last_at))
       FROM (SELECT event_type, count(*) n, max(created_at) last_at FROM analytics_events
             WHERE event_type LIKE 'alma\_%' AND created_at >= p_since GROUP BY event_type) t), '[]'::jsonb)
  ) INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.admin_a10_event_counts(p_since timestamptz, p_types text[])
RETURNS TABLE(event_type text, n bigint) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Accès admin requis'; END IF;
  RETURN QUERY SELECT e.event_type::text, count(*)::bigint FROM analytics_events e
    WHERE e.event_type = ANY(p_types) AND e.created_at >= p_since GROUP BY e.event_type;
END $$;

CREATE OR REPLACE FUNCTION public.admin_a10_cultural_fact_stats(p_since timestamptz)
RETURNS TABLE(fact_id text, views bigint, clicks bigint) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Accès admin requis'; END IF;
  RETURN QUERY SELECT e.metadata->>'fact_id',
    count(*) FILTER (WHERE e.event_type = 'alma_cultural_fact_seen')::bigint,
    count(*) FILTER (WHERE e.event_type = 'alma_cultural_fact_action_clicked')::bigint
  FROM analytics_events e
  WHERE e.event_type IN ('alma_cultural_fact_seen', 'alma_cultural_fact_action_clicked')
    AND e.created_at >= p_since AND e.metadata->>'fact_id' IS NOT NULL
  GROUP BY 1;
END $$;

CREATE OR REPLACE FUNCTION public.admin_a10_affinity_onboarding_stats(p_since timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Accès admin requis'; END IF;
  WITH ev AS (
    SELECT event_type, coalesce(user_id::text, metadata->>'user_id') AS uid, created_at FROM analytics_events
    WHERE event_type IN ('onboarding_started', 'onboarding_completed') AND created_at >= p_since
  ), per AS (
    SELECT uid, min(created_at) FILTER (WHERE event_type = 'onboarding_started') AS s,
                max(created_at) FILTER (WHERE event_type = 'onboarding_completed') AS c
    FROM ev WHERE uid IS NOT NULL GROUP BY uid
  )
  SELECT jsonb_build_object(
    'started', count(*) FILTER (WHERE s IS NOT NULL),
    'completed', count(*) FILTER (WHERE c IS NOT NULL),
    'avg_duration_s', round(avg(extract(epoch FROM c - s)) FILTER (WHERE c > s AND c - s < interval '1 hour'))
  ) INTO r FROM per;
  RETURN r;
END $$;

-- Conversations suivies d'un événement du même membre dans les 10 minutes.
CREATE OR REPLACE FUNCTION public.admin_a10_alma_followed_by_action(p_since timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Accès admin requis'; END IF;
  SELECT jsonb_build_object('total', count(*), 'followed', count(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM analytics_events e WHERE e.user_id = c.user_id
        AND e.created_at >= c.created_at AND e.created_at <= c.created_at + interval '10 minutes')))
  INTO r FROM alma_conversations c WHERE c.created_at >= p_since;
  RETURN r;
END $$;

-- Sous-étapes d'inscription : membres uniques plus événements anonymes.
CREATE OR REPLACE FUNCTION public.admin_a10_signup_substeps(p_since timestamptz)
RETURNS TABLE(event_type text, n bigint) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Accès admin requis'; END IF;
  RETURN QUERY SELECT e.event_type::text,
    (count(DISTINCT e.user_id) + count(*) FILTER (WHERE e.user_id IS NULL))::bigint
  FROM analytics_events e
  WHERE e.event_type IN ('signup_page_loaded','signup_role_selected','signup_email_entered','signup_password_entered','signup_submit_clicked')
    AND e.created_at >= p_since
  GROUP BY e.event_type;
END $$;

CREATE OR REPLACE FUNCTION public.admin_a10_whisper_stats(p_since timestamptz)
RETURNS TABLE(whisper_type text, emitted bigint, actions bigint, dismissed bigint, blacklisted_users bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Accès admin requis'; END IF;
  RETURN QUERY SELECT w.whisper_type::text, count(*)::bigint,
    count(*) FILTER (WHERE w.action_taken IS NOT NULL AND w.action_taken <> 'dismissed')::bigint,
    count(*) FILTER (WHERE w.dismissed_reason = 'closed_manually')::bigint,
    count(DISTINCT w.user_id) FILTER (WHERE w.dismissed_reason = 'blacklist')::bigint
  FROM alma_whisper_history w WHERE w.emitted_at >= p_since GROUP BY w.whisper_type;
END $$;

CREATE POLICY "A10 admins read whisper history" ON public.alma_whisper_history
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.admin_a10_mood_view_counts()
RETURNS TABLE(mood_id uuid, n bigint) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Accès admin requis'; END IF;
  RETURN QUERY SELECT v.mood_id, count(*)::bigint FROM alma_mood_views v
    WHERE v.created_at >= now() - interval '30 days' GROUP BY v.mood_id;
END $$;

-- Libellés de compétences hors référentiel, même définition que la pastille du menu.
CREATE OR REPLACE FUNCTION public.admin_a10_pending_competences()
RETURNS TABLE(label text, usage_count bigint) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Accès admin requis'; END IF;
  RETURN QUERY SELECT s.c::text, count(*)::bigint FROM (
      SELECT unnest(competences) AS c FROM sitter_profiles WHERE competences IS NOT NULL
      UNION ALL
      SELECT unnest(competences) FROM owner_profiles WHERE competences IS NOT NULL
    ) s
    WHERE s.c IS NOT NULL AND s.c <> ''
      AND NOT EXISTS (SELECT 1 FROM competences_validees v WHERE v.label = s.c)
    GROUP BY s.c ORDER BY count(*) DESC, s.c;
END $$;

DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY[
    'admin_a10_alma_bubble_stats(timestamptz)', 'admin_a10_event_counts(timestamptz, text[])',
    'admin_a10_cultural_fact_stats(timestamptz)', 'admin_a10_affinity_onboarding_stats(timestamptz)',
    'admin_a10_alma_followed_by_action(timestamptz)', 'admin_a10_signup_substeps(timestamptz)',
    'admin_a10_whisper_stats(timestamptz)', 'admin_a10_mood_view_counts()', 'admin_a10_pending_competences()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_sit_view_paths(uuid) TO authenticated;
