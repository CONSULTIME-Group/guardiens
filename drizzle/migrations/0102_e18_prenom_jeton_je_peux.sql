-- Lot E18 (25/10/2026, arène entraide, n° 43 du registre) : la page jeton
-- « Je peux » (MissionQuickCanHelp) lit owner_first_name, que
-- peek_mission_action_token ne renvoyait pas : la page écrivait « Une personne ».
-- La fonction est réécrite en entier à partir de sa dernière définition du
-- dépôt (0009_entraide_wave_engine.sql, identique à la production le
-- 25/10/2026), avec le prénom de l'auteur du besoin en plus.
-- Type de retour inchangé (jsonb), droits inchangés (service_role seul,
-- appel par la fonction edge mission-quick-action). Rejouable.
CREATE OR REPLACE FUNCTION public.peek_mission_action_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  m record;
  v_owner_first_name text;
BEGIN
  SELECT * INTO r FROM public.mission_action_tokens WHERE token = p_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false, 'reason', 'invalid'); END IF;
  IF r.used_at IS NOT NULL THEN RETURN jsonb_build_object('valid', false, 'reason', 'already_used'); END IF;
  IF r.expires_at <= now() THEN RETURN jsonb_build_object('valid', false, 'reason', 'expired'); END IF;

  SELECT s.id, s.title, s.city, s.status, s.slug, s.date_needed, s.user_id
    INTO m FROM public.small_missions s WHERE s.id = r.mission_id;

  IF m.status IS DISTINCT FROM 'open' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'mission_closed');
  END IF;

  SELECT nullif(btrim(p.first_name), '') INTO v_owner_first_name
    FROM public.profiles p WHERE p.id = m.user_id;

  RETURN jsonb_build_object(
    'valid', true,
    'action', r.action,
    'mission_id', m.id,
    'mission_title', coalesce(m.title, ''),
    'mission_city', coalesce(m.city, ''),
    'mission_slug', coalesce(m.slug, ''),
    'date_needed', m.date_needed,
    'owner_first_name', v_owner_first_name
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.peek_mission_action_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.peek_mission_action_token(text) TO service_role;
