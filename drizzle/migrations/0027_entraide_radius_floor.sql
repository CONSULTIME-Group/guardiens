-- 0027 : élargissement progressif du rayon de diffusion de l'Entraide.
-- Une préférence explicite (alert_preferences « missions » avec rayon) est respectée
-- en toutes circonstances. Sans préférence, le plancher de la mission s'applique
-- (30, puis 50, puis 100 km quand le vivier local est épuisé).

CREATE OR REPLACE FUNCTION public.mutual_aid_radius_is_explicit(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.alert_preferences ap
    WHERE ap.user_id = p_user
      AND coalesce(ap.active, true) = true
      AND ap.radius_km IS NOT NULL
      AND ap.alert_types @> array['missions']
  );
$function$;

ALTER TABLE public.small_missions ADD COLUMN IF NOT EXISTS wave_radius_floor integer NOT NULL DEFAULT 30;
COMMENT ON COLUMN public.small_missions.wave_radius_floor IS
  'Plancher de diffusion de cette mission (km), appliqué aux seules personnes sans préférence de rayon explicite. Relevé automatiquement par enqueue_mission_wave (30, 50, 100) quand le vivier local est épuisé.';

CREATE OR REPLACE FUNCTION public.mission_wave_audience_floor(p_mission_id uuid, p_floor integer, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(helper_id uuid, distance_km numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH m AS (
    SELECT id, user_id, latitude::double precision AS lat, longitude::double precision AS lng
    FROM public.small_missions WHERE id = p_mission_id
  )
  SELECT p.id, round(d.dist::numeric, 2) AS distance_km
  FROM m
  JOIN public.profiles p ON p.id IS DISTINCT FROM m.user_id
  LEFT JOIN public.email_preferences ep ON ep.user_id = p.id
  LEFT JOIN public.suppressed_emails se ON lower(se.email) = lower(p.email)
  CROSS JOIN LATERAL (
    SELECT 6371 * acos(least(1.0, greatest(-1.0,
      cos(radians(m.lat)) * cos(radians(p.latitude::double precision))
      * cos(radians(p.longitude::double precision) - radians(m.lng))
      + sin(radians(m.lat)) * sin(radians(p.latitude::double precision))
    ))) AS dist
  ) d
  WHERE m.lat IS NOT NULL AND m.lng IS NOT NULL
    AND coalesce(p.available_for_help, false)
    AND coalesce(p.account_status, 'active') = 'active'
    AND p.email IS NOT NULL
    AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
    AND coalesce(ep.new_mission_digest, true) = true
    AND coalesce(ep.product_emails, true) = true
    AND se.email IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users b
      WHERE (b.blocker_id = m.user_id AND b.blocked_id = p.id)
         OR (b.blocker_id = p.id AND b.blocked_id = m.user_id)
    )
    AND (
      d.dist <= public.mutual_aid_radius_km(p.id)
      OR (NOT public.mutual_aid_radius_is_explicit(p.id) AND d.dist <= coalesce(p_floor, 30))
    )
  ORDER BY d.dist ASC, p.id ASC
  LIMIT greatest(p_limit, 0) OFFSET greatest(p_offset, 0);
$function$;

CREATE OR REPLACE FUNCTION public.mission_wave_audience(p_mission_id uuid, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(helper_id uuid, distance_km numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.helper_id, a.distance_km
  FROM public.mission_wave_audience_floor(
    p_mission_id,
    (SELECT coalesce(sm.wave_radius_floor, 30) FROM public.small_missions sm WHERE sm.id = p_mission_id),
    p_limit, p_offset
  ) a;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_mission_wave(p_mission_id uuid, p_size integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_wave integer;
  v_floor integer;
  v_tier integer;
  v_applied integer;
  v_rows jsonb;
  v_count integer := 0;
BEGIN
  SELECT coalesce(wave_count, 0) + 1, coalesce(wave_radius_floor, 30)
    INTO v_wave, v_floor
  FROM public.small_missions WHERE id = p_mission_id;

  IF v_wave IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'mission_not_found');
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _wave_pick(helper_id uuid, distance_km numeric) ON COMMIT DROP;

  -- Paliers : plancher courant, puis 50 et 100 km. Premier palier non vide retenu.
  FOR v_tier IN
    SELECT DISTINCT t FROM unnest(array[30, 50, 100, v_floor]) AS t
    WHERE t >= v_floor ORDER BY t
  LOOP
    -- WHERE explicite : le garde-fou pg_safeupdate refuse tout DELETE sans condition via l'API.
    DELETE FROM _wave_pick WHERE true;

    INSERT INTO _wave_pick(helper_id, distance_km)
    SELECT a.helper_id, a.distance_km
    FROM public.mission_wave_audience_floor(p_mission_id, v_tier, 10000, 0) a
    WHERE NOT EXISTS (
      SELECT 1 FROM public.mission_notification_queue q
      WHERE q.mission_id = p_mission_id
        AND q.helper_id = a.helper_id
        AND q.status IN ('queued', 'sent')
    )
    ORDER BY a.distance_km ASC
    LIMIT greatest(p_size, 0);

    SELECT count(*) INTO v_count FROM _wave_pick;
    v_applied := v_tier;
    EXIT WHEN v_count > 0;
  END LOOP;

  IF v_applied > v_floor THEN
    UPDATE public.small_missions SET wave_radius_floor = v_applied WHERE id = p_mission_id;
  END IF;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('ok', true, 'wave', v_wave, 'count', 0, 'helpers', '[]'::jsonb, 'radius_floor', v_applied);
  END IF;

  INSERT INTO public.mission_notification_queue (helper_id, mission_id, distance_km, wave, status)
  SELECT w.helper_id, p_mission_id, w.distance_km, v_wave, 'queued'
  FROM _wave_pick w
  ON CONFLICT (helper_id, mission_id) DO UPDATE
    SET status = 'queued',
        wave = EXCLUDED.wave,
        distance_km = EXCLUDED.distance_km,
        queued_at = now(),
        sent_at = NULL,
        skip_reason = NULL
    WHERE public.mission_notification_queue.status NOT IN ('queued', 'sent');

  INSERT INTO public.mission_action_tokens (mission_id, helper_id, action, token)
  SELECT p_mission_id, w.helper_id, 'can_help', encode(gen_random_bytes(24), 'hex')
  FROM _wave_pick w;

  UPDATE public.small_missions
     SET wave_count = v_wave, last_wave_at = now()
   WHERE id = p_mission_id;

  SELECT jsonb_agg(jsonb_build_object(
    'helper_id', w.helper_id,
    'distance_km', w.distance_km,
    'token', t.token
  ))
  INTO v_rows
  FROM _wave_pick w
  JOIN LATERAL (
    SELECT token FROM public.mission_action_tokens
    WHERE mission_id = p_mission_id AND helper_id = w.helper_id AND used_at IS NULL
    ORDER BY created_at DESC LIMIT 1
  ) t ON true;

  RETURN jsonb_build_object('ok', true, 'wave', v_wave, 'count', v_count,
    'helpers', coalesce(v_rows, '[]'::jsonb), 'radius_floor', v_applied);
END;
$function$;

-- Signal admin : besoin ouvert depuis plus de 72 h, zéro personne joignable même à 100 km.
CREATE OR REPLACE FUNCTION public.detect_missions_without_audience()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inserted integer := 0;
BEGIN
  UPDATE public.admin_signals s
     SET resolved_at = now(), action_taken = 'audience_found_or_closed'
   WHERE s.signal_type = 'mission_no_audience'
     AND s.resolved_at IS NULL
     AND (
       NOT EXISTS (SELECT 1 FROM public.small_missions m WHERE m.id = s.entity_id AND m.status = 'open')
       OR EXISTS (SELECT 1 FROM public.mission_wave_audience_floor(s.entity_id, 100, 1, 0))
     );

  INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
  SELECT 'mission_no_audience', 'critical', 'small_mission', m.id,
         jsonb_build_object('title', m.title, 'city', m.city, 'open_since', m.created_at, 'radius_floor', 100)
  FROM public.small_missions m
  WHERE m.status = 'open'
    AND m.mission_type = 'besoin'
    AND m.created_at < now() - interval '72 hours'
    AND NOT EXISTS (SELECT 1 FROM public.mission_wave_audience_floor(m.id, 100, 1, 0))
  ON CONFLICT (signal_type, entity_id) WHERE resolved_at IS NULL DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$function$;

-- Rayon actuel du membre connecté, pour l'affichage « Vous recevez les besoins dans un rayon de X km ».
CREATE OR REPLACE FUNCTION public.my_mutual_aid_radius_km()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN auth.uid() IS NULL THEN NULL
              ELSE round(public.mutual_aid_radius_km(auth.uid()))::integer END;
$function$;

REVOKE EXECUTE ON FUNCTION public.mutual_aid_radius_is_explicit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mission_wave_audience_floor(uuid, integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mission_wave_audience(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_mission_wave(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.detect_missions_without_audience() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.my_mutual_aid_radius_km() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mutual_aid_radius_is_explicit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mission_wave_audience_floor(uuid, integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.mission_wave_audience(uuid, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_mission_wave(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.detect_missions_without_audience() TO service_role;
GRANT EXECUTE ON FUNCTION public.my_mutual_aid_radius_km() TO authenticated, service_role;
