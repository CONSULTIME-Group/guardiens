-- 0026 : une personne écartée à un passage précédent (status 'skipped') redevient
-- sélectionnable si elle est éligible aujourd'hui. Seules 'queued' et 'sent' restent exclues.
-- Droits : fonctions du moteur réservées à service_role.
CREATE OR REPLACE FUNCTION public.enqueue_mission_wave(p_mission_id uuid, p_size integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_wave integer;
  v_rows jsonb;
  v_count integer := 0;
BEGIN
  SELECT coalesce(wave_count, 0) + 1 INTO v_wave
  FROM public.small_missions WHERE id = p_mission_id;

  IF v_wave IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'mission_not_found');
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _wave_pick(helper_id uuid, distance_km numeric) ON COMMIT DROP;
  -- WHERE explicite : le garde-fou pg_safeupdate refuse tout DELETE sans condition via l'API.
  DELETE FROM _wave_pick WHERE true;

  INSERT INTO _wave_pick(helper_id, distance_km)
  SELECT a.helper_id, a.distance_km
  FROM public.mission_wave_audience(p_mission_id, 10000, 0) a
  WHERE NOT EXISTS (
    SELECT 1 FROM public.mission_notification_queue q
    WHERE q.mission_id = p_mission_id
      AND q.helper_id = a.helper_id
      AND q.status IN ('queued', 'sent')
  )
  ORDER BY a.distance_km ASC
  LIMIT greatest(p_size, 0);

  SELECT count(*) INTO v_count FROM _wave_pick;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('ok', true, 'wave', v_wave, 'count', 0, 'helpers', '[]'::jsonb);
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

  RETURN jsonb_build_object('ok', true, 'wave', v_wave, 'count', v_count, 'helpers', coalesce(v_rows, '[]'::jsonb));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.enqueue_mission_wave(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mission_wave_audience(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.emit_mission_meetup_tokens(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_mission_meetup(text, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.peek_mission_meetup_token(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.peek_mission_action_token(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_mission_action_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_mission_wave(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.mission_wave_audience(uuid, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.emit_mission_meetup_tokens(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_mission_meetup(text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.peek_mission_meetup_token(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.peek_mission_action_token(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_mission_action_token(text) TO service_role;