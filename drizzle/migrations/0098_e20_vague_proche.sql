-- Lot E20 « Vague proche » (décision de Jérémie du 25/10/2026) : l'entraide
-- sollicite au plus à 30 km, 15 km de préférence, les plus proches d'abord,
-- par groupes de 10. Plus de paliers 50 et 100 km.
--
-- 1. mission_wave_audience_floor : rien au-delà de 30 km, quel que soit le
--    plancher demandé ou le rayon déclaré de l'aidant. Le rayon d'un aidant
--    peut seulement réduire (mutual_aid_radius_km vaut 30 sans préférence).
-- 2. enqueue_mission_wave : une vague prend les 10 personnes non encore
--    prévenues les plus proches à 30 km au plus, donc d'abord celles à 15 km,
--    complétées dans la même vague jusqu'à 30 km quand il en reste moins de
--    10 à 15 km (médiane mesurée le 25/10 : 4,5 personnes à 15 km, 9 à 30 km).
--    Elle renvoie aussi « remaining » (personnes encore à prévenir) et le
--    palier atteint (15 ou 30) dans radius_floor, à titre d'information.
-- 3. small_missions.wave_exhausted_at + mark_mission_wave_exhausted : quand
--    toutes les personnes disponibles à 30 km au plus ont été prévenues,
--    plus aucune vague, et le demandeur reçoit un seul message affirmatif.
-- 4. mission_wave_audience, mission_wave_audience_preview (formulaire),
--    detect_missions_without_audience (signal admin) et
--    my_mutual_aid_radius_km (ligne « rayon de X km ») suivent le même
--    plafond de 30 km.
-- Fonctions reprises de la production (pg_get_functiondef du 25/10/2026),
-- identiques aux dernières définitions du dépôt (0027) pour celles qui y
-- figurent. Aucune donnée existante modifiée. Rejouable.

ALTER TABLE public.small_missions ADD COLUMN IF NOT EXISTS wave_exhausted_at timestamptz NULL;
COMMENT ON COLUMN public.small_missions.wave_exhausted_at IS
  'Lot E20 : toutes les personnes disponibles à 30 km au plus ont été prévenues. Plus aucune vague, message unique au demandeur.';

ALTER TABLE public.small_missions ALTER COLUMN wave_radius_floor SET DEFAULT 15;
COMMENT ON COLUMN public.small_missions.wave_radius_floor IS
  'Lot E20 : palier atteint par la dernière vague (15 ou 30 km), à titre d''information. La diffusion ne dépasse jamais 30 km.';

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
    -- Lot E20 : 30 km au plus, en toutes circonstances ; le rayon déclaré de
    -- l'aidant (30 sans préférence) peut seulement réduire.
    AND d.dist <= least(coalesce(p_floor, 30), 30)::double precision
    AND d.dist <= public.mutual_aid_radius_km(p.id)::double precision
  ORDER BY d.dist ASC, p.id ASC
  LIMIT greatest(p_limit, 0) OFFSET greatest(p_offset, 0);
$function$;

CREATE OR REPLACE FUNCTION public.mission_wave_audience(p_mission_id uuid, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(helper_id uuid, distance_km numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Lot E20 : toute l'audience joignable, 30 km au plus, plus proches d'abord.
  SELECT a.helper_id, a.distance_km
  FROM public.mission_wave_audience_floor(p_mission_id, 30, p_limit, p_offset) a;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_mission_wave(p_mission_id uuid, p_size integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_wave integer;
  v_exhausted timestamptz;
  v_size integer := least(greatest(coalesce(p_size, 10), 0), 10);
  v_tier integer := 15;
  v_rows jsonb;
  v_count integer := 0;
  v_remaining integer := 0;
BEGIN
  SELECT coalesce(wave_count, 0) + 1, wave_exhausted_at
    INTO v_wave, v_exhausted
  FROM public.small_missions WHERE id = p_mission_id;

  IF v_wave IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'mission_not_found');
  END IF;

  -- Lot E20 : vivier épuisé, plus aucune vague.
  IF v_exhausted IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'wave', v_wave, 'count', 0, 'helpers', '[]'::jsonb,
      'radius_floor', 30, 'remaining', 0, 'exhausted', true);
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _wave_pick(helper_id uuid, distance_km numeric) ON COMMIT DROP;
  -- WHERE explicite : le garde-fou pg_safeupdate refuse tout DELETE sans condition via l'API.
  DELETE FROM _wave_pick WHERE true;

  -- Lot E20 : les 10 plus proches encore jamais prévenus, à 30 km au plus.
  -- Le tri par distance prend d'abord tout le palier de 15 km, puis complète
  -- la même vague jusqu'à 30 km.
  INSERT INTO _wave_pick(helper_id, distance_km)
  SELECT a.helper_id, a.distance_km
  FROM public.mission_wave_audience_floor(p_mission_id, 30, 10000, 0) a
  WHERE NOT EXISTS (
    SELECT 1 FROM public.mission_notification_queue q
    WHERE q.mission_id = p_mission_id
      AND q.helper_id = a.helper_id
      AND q.status IN ('queued', 'sent')
  )
  ORDER BY a.distance_km ASC, a.helper_id ASC
  LIMIT v_size;

  SELECT count(*), CASE WHEN coalesce(max(distance_km), 0) <= 15 THEN 15 ELSE 30 END
    INTO v_count, v_tier
  FROM _wave_pick;

  -- Personnes encore à prévenir après cette vague.
  SELECT count(*) INTO v_remaining
  FROM public.mission_wave_audience_floor(p_mission_id, 30, 10000, 0) a
  WHERE NOT EXISTS (
    SELECT 1 FROM public.mission_notification_queue q
    WHERE q.mission_id = p_mission_id
      AND q.helper_id = a.helper_id
      AND q.status IN ('queued', 'sent')
  )
  AND NOT EXISTS (SELECT 1 FROM _wave_pick w WHERE w.helper_id = a.helper_id);

  IF v_count = 0 THEN
    RETURN jsonb_build_object('ok', true, 'wave', v_wave, 'count', 0, 'helpers', '[]'::jsonb,
      'radius_floor', 30, 'remaining', v_remaining, 'exhausted', false);
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
     SET wave_count = v_wave, last_wave_at = now(), wave_radius_floor = v_tier
   WHERE id = p_mission_id;

  SELECT jsonb_agg(jsonb_build_object(
    'helper_id', w.helper_id,
    'distance_km', w.distance_km,
    'token', t.token
  ) ORDER BY w.distance_km ASC, w.helper_id ASC)
  INTO v_rows
  FROM _wave_pick w
  JOIN LATERAL (
    SELECT token FROM public.mission_action_tokens
    WHERE mission_id = p_mission_id AND helper_id = w.helper_id AND used_at IS NULL
    ORDER BY created_at DESC LIMIT 1
  ) t ON true;

  RETURN jsonb_build_object('ok', true, 'wave', v_wave, 'count', v_count,
    'helpers', coalesce(v_rows, '[]'::jsonb), 'radius_floor', v_tier,
    'remaining', v_remaining, 'exhausted', false);
END;
$function$;

-- Lot E20 : pose du marqueur d'épuisement, une seule fois par besoin.
-- Renvoie le nombre de personnes prévenues (file « sent »), ou NULL quand le
-- marqueur était déjà posé (le message est alors déjà parti).
CREATE OR REPLACE FUNCTION public.mark_mission_wave_exhausted(p_mission_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated integer;
  v_sent integer;
BEGIN
  UPDATE public.small_missions
     SET wave_exhausted_at = now()
   WHERE id = p_mission_id AND wave_exhausted_at IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN NULL;
  END IF;
  SELECT count(*) INTO v_sent
  FROM public.mission_notification_queue q
  WHERE q.mission_id = p_mission_id AND q.status = 'sent';
  RETURN v_sent;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mission_wave_audience_preview(p_lat double precision, p_lng double precision)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select count(*)::integer
  from public.profiles p
  left join public.email_preferences ep on ep.user_id = p.id
  left join public.suppressed_emails se on lower(se.email) = lower(p.email)
  cross join lateral (
    select 6371 * acos(least(1.0, greatest(-1.0,
      cos(radians(p_lat)) * cos(radians(p.latitude::double precision))
      * cos(radians(p.longitude::double precision) - radians(p_lng))
      + sin(radians(p_lat)) * sin(radians(p.latitude::double precision))
    ))) as dist
  ) d
  where p_lat is not null and p_lng is not null
    and p.id is distinct from auth.uid()
    and coalesce(p.available_for_help, false)
    and coalesce(p.account_status, 'active') = 'active'
    and p.email is not null
    and p.latitude is not null and p.longitude is not null
    and coalesce(ep.new_mission_digest, true) = true
    and coalesce(ep.product_emails, true) = true
    and se.email is null
    and not exists (
      select 1 from public.blocked_users b
      where (b.blocker_id = p.id and b.blocked_id = auth.uid())
         or (b.blocker_id = auth.uid() and b.blocked_id = p.id)
    )
    -- Lot E20 : même plafond que le moteur de vagues.
    and d.dist <= least(public.mutual_aid_radius_km(p.id), 30);
$function$;

-- Signal admin : besoin ouvert depuis plus de 72 h, zéro personne joignable à 30 km.
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
       OR EXISTS (SELECT 1 FROM public.mission_wave_audience_floor(s.entity_id, 30, 1, 0))
     );

  INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
  SELECT 'mission_no_audience', 'critical', 'small_mission', m.id,
         jsonb_build_object('title', m.title, 'city', m.city, 'open_since', m.created_at, 'radius_floor', 30)
  FROM public.small_missions m
  WHERE m.status = 'open'
    AND m.mission_type = 'besoin'
    AND m.created_at < now() - interval '72 hours'
    AND NOT EXISTS (SELECT 1 FROM public.mission_wave_audience_floor(m.id, 30, 1, 0))
  ON CONFLICT (signal_type, entity_id) WHERE resolved_at IS NULL DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$function$;

-- Rayon réel du membre connecté pour l'entraide, 30 km au plus.
CREATE OR REPLACE FUNCTION public.my_mutual_aid_radius_km()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN auth.uid() IS NULL THEN NULL
              ELSE least(round(public.mutual_aid_radius_km(auth.uid())), 30)::integer END;
$function$;

REVOKE EXECUTE ON FUNCTION public.mission_wave_audience_floor(uuid, integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mission_wave_audience(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_mission_wave(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_mission_wave_exhausted(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.detect_missions_without_audience() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.my_mutual_aid_radius_km() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mission_wave_audience_floor(uuid, integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.mission_wave_audience(uuid, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_mission_wave(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_mission_wave_exhausted(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.detect_missions_without_audience() TO service_role;
GRANT EXECUTE ON FUNCTION public.my_mutual_aid_radius_km() TO authenticated, service_role;
