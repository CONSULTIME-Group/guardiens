CREATE OR REPLACE FUNCTION public.confirm_mission_meetup(p_token text, p_word text DEFAULT NULL::text, p_public_ok boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  m record;
  v_helper_id uuid;
  v_other uuid;
  v_happened boolean;
  v_ref_date date;
  v_reopen boolean := false;
  v_badge_rows int := 0;
  v_word text;
BEGIN
  SELECT * INTO r FROM public.mission_action_tokens WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid'); END IF;
  IF r.action NOT IN ('meetup_yes', 'meetup_no') THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid'); END IF;
  IF r.used_at IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_used'); END IF;
  IF r.expires_at <= now() THEN RETURN jsonb_build_object('ok', false, 'reason', 'expired'); END IF;

  v_happened := (r.action = 'meetup_yes');

  SELECT s.id, s.user_id, s.title, s.status, s.close_reason, s.date_needed, s.end_date INTO m
  FROM public.small_missions s WHERE s.id = r.mission_id FOR UPDATE;
  IF m.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid'); END IF;

  SELECT resp.responder_id INTO v_helper_id
  FROM public.small_mission_responses resp
  WHERE resp.mission_id = r.mission_id AND resp.status = 'accepted'
  ORDER BY resp.accepted_at NULLS LAST, resp.created_at LIMIT 1;

  v_other := CASE WHEN r.helper_id = m.user_id THEN v_helper_id ELSE m.user_id END;

  UPDATE public.mission_action_tokens SET used_at = now()
   WHERE mission_id = r.mission_id AND helper_id = r.helper_id
     AND action IN ('meetup_yes', 'meetup_no') AND used_at IS NULL;

  v_word := NULLIF(btrim(COALESCE(p_word, '')), '');
  IF v_word IS NOT NULL THEN v_word := left(v_word, 140); END IF;

  IF v_other IS NOT NULL THEN
    INSERT INTO public.mission_feedbacks (mission_id, giver_id, receiver_id, positive, comment, public_ok)
    VALUES (r.mission_id, r.helper_id, v_other, v_happened, v_word, COALESCE(p_public_ok, true))
    ON CONFLICT (mission_id, giver_id) DO UPDATE
      SET positive = EXCLUDED.positive,
          comment = COALESCE(EXCLUDED.comment, public.mission_feedbacks.comment),
          public_ok = EXCLUDED.public_ok;
  END IF;

  IF v_happened THEN
    IF v_helper_id IS NOT NULL AND r.helper_id = v_helper_id THEN
      INSERT INTO public.badge_attributions (user_id, badge_id, giver_id, mission_id, is_manual)
      VALUES (v_helper_id, 'coup_de_main_or', m.user_id, m.id, false)
      ON CONFLICT DO NOTHING;
      GET DIAGNOSTICS v_badge_rows = ROW_COUNT;
    END IF;

    UPDATE public.small_missions
       SET status = 'completed', closed_at = COALESCE(closed_at, now()), close_reason = 'meetup_confirmed', updated_at = now()
     WHERE id = m.id
       AND status <> 'cancelled'
       AND (status <> 'completed' OR close_reason IS NOT DISTINCT FROM 'auto_completed_after_date');
  ELSIF m.status = 'cancelled' OR (m.status = 'completed' AND m.close_reason IS NOT DISTINCT FROM 'meetup_confirmed') THEN
    NULL;
  ELSE
    v_ref_date := COALESCE(m.end_date, m.date_needed);
    v_reopen := v_ref_date IS NOT NULL AND v_ref_date >= CURRENT_DATE;

    IF v_reopen THEN
      UPDATE public.small_missions
         SET status = 'open', updated_at = now()
       WHERE id = m.id;
    ELSE
      UPDATE public.small_missions
         SET status = 'completed', closed_at = now(), close_reason = 'meetup_not_happened', updated_at = now()
       WHERE id = m.id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'happened', v_happened,
    'mission_id', m.id,
    'mission_title', COALESCE(m.title, ''),
    'reopened', v_reopen,
    'badge_awarded', (v_badge_rows > 0),
    'helper_id', v_helper_id,
    'owner_id', m.user_id,
    'actor_id', r.helper_id
  );
END;
$function$;

DO $migration$
DECLARE v_count int;
BEGIN
  CREATE TABLE IF NOT EXISTS public._backup_mission_coords_e10_20261011 AS
    SELECT id, latitude, longitude FROM public.small_missions
     WHERE id IN ('62ec0926-ee0b-4e9d-8740-cf5c1c69246f', '41746a54-159c-47dd-bc6c-c2e934c09d1c', '7f344be3-3b86-4b48-80af-603337ccb1d4');
  ALTER TABLE public._backup_mission_coords_e10_20261011 ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public._backup_mission_coords_e10_20261011 FROM PUBLIC, anon, authenticated;

  UPDATE public.small_missions s
     SET latitude = v.lat, longitude = v.lng, updated_at = now()
    FROM (VALUES
      ('62ec0926-ee0b-4e9d-8740-cf5c1c69246f'::uuid, 48.5627::double precision, -2.1383::double precision),
      ('41746a54-159c-47dd-bc6c-c2e934c09d1c'::uuid, 46.7846, -0.0692),
      ('7f344be3-3b86-4b48-80af-603337ccb1d4'::uuid, 45.1713, 5.5444)
    ) AS v(id, lat, lng)
   WHERE s.id = v.id AND s.latitude IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Lot E10 : % besoins situés', v_count;
  IF v_count > 3 THEN RAISE EXCEPTION 'Lot E10 : % lignes au lieu de 3 au plus', v_count; END IF;
END;
$migration$;