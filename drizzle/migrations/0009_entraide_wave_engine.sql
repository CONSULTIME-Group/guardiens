-- Entraide, nouveau modele : un besoin, dix personnes du coin, un « je peux ».
-- Lot 1, partie A : colonnes, table de jetons, fonctions du moteur de vagues.

ALTER TABLE public.mission_notification_queue ADD COLUMN IF NOT EXISTS wave integer;
ALTER TABLE public.small_missions ADD COLUMN IF NOT EXISTS last_wave_at timestamptz;
ALTER TABLE public.small_missions ADD COLUMN IF NOT EXISTS wave_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS helps_with text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_helps_with_len
  CHECK (helps_with IS NULL OR char_length(helps_with) <= 200);

COMMENT ON COLUMN public.profiles.helps_with IS
  'Entraide : ce que le membre aime faire pour les gens du coin. 200 caracteres maximum, garde-fou anti-argent.';
COMMENT ON COLUMN public.mission_notification_queue.wave IS
  'Numero de vague du moteur notify-mission-wave. NULL = ligne historique traitee par le digest quotidien.';

-- Jetons « Je peux » (mecanisme identique aux jetons de candidature, table dediee).
CREATE TABLE IF NOT EXISTS public.mission_action_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.small_missions(id) ON DELETE CASCADE,
  helper_id uuid NOT NULL,
  action text NOT NULL DEFAULT 'can_help',
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamptz
);
CREATE INDEX IF NOT EXISTS mission_action_tokens_mission_idx ON public.mission_action_tokens(mission_id, helper_id);

GRANT ALL ON public.mission_action_tokens TO service_role;
ALTER TABLE public.mission_action_tokens ENABLE ROW LEVEL SECURITY;
-- Aucune policy : lecture et ecriture reservees au service_role et aux fonctions SECURITY DEFINER.

-- Vivier d'une vague : proximite seule, sans filtre de competence ni de categorie.
CREATE OR REPLACE FUNCTION public.mission_wave_audience(
  p_mission_id uuid,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
)
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
    AND d.dist <= public.mutual_aid_radius_km(p.id)
  ORDER BY d.dist ASC, p.id ASC
  LIMIT greatest(p_limit, 0) OFFSET greatest(p_offset, 0);
$function$;

GRANT EXECUTE ON FUNCTION public.mission_wave_audience(uuid, integer, integer) TO service_role;

-- Prepare la vague suivante : met en file les dix plus proches encore jamais
-- prevenus, cree un jeton « je peux » par personne et renvoie la liste.
CREATE OR REPLACE FUNCTION public.enqueue_mission_wave(
  p_mission_id uuid,
  p_size integer DEFAULT 10
)
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
  DELETE FROM _wave_pick;

  INSERT INTO _wave_pick(helper_id, distance_km)
  SELECT a.helper_id, a.distance_km
  FROM public.mission_wave_audience(p_mission_id, 10000, 0) a
  WHERE NOT EXISTS (
    SELECT 1 FROM public.mission_notification_queue q
    WHERE q.mission_id = p_mission_id AND q.helper_id = a.helper_id
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
  ON CONFLICT (helper_id, mission_id) DO NOTHING;

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

GRANT EXECUTE ON FUNCTION public.enqueue_mission_wave(uuid, integer) TO service_role;

-- Lecture d'un jeton, sans effet de bord.
CREATE OR REPLACE FUNCTION public.peek_mission_action_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  m record;
BEGIN
  SELECT * INTO r FROM public.mission_action_tokens WHERE token = p_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false, 'reason', 'invalid'); END IF;
  IF r.used_at IS NOT NULL THEN RETURN jsonb_build_object('valid', false, 'reason', 'already_used'); END IF;
  IF r.expires_at <= now() THEN RETURN jsonb_build_object('valid', false, 'reason', 'expired'); END IF;

  SELECT s.id, s.title, s.city, s.status, s.slug, s.date_needed
    INTO m FROM public.small_missions s WHERE s.id = r.mission_id;

  IF m.status IS DISTINCT FROM 'open' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'mission_closed');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'action', r.action,
    'mission_id', m.id,
    'mission_title', coalesce(m.title, ''),
    'mission_city', coalesce(m.city, ''),
    'mission_slug', coalesce(m.slug, ''),
    'date_needed', m.date_needed
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.peek_mission_action_token(text) TO service_role;

-- Consommation : cree la reponse « je peux », usage unique.
CREATE OR REPLACE FUNCTION public.consume_mission_action_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  m record;
  v_response_id uuid;
BEGIN
  SELECT * INTO r FROM public.mission_action_tokens WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid'); END IF;
  IF r.used_at IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_used'); END IF;
  IF r.expires_at <= now() THEN RETURN jsonb_build_object('ok', false, 'reason', 'expired'); END IF;

  SELECT s.id, s.title, s.status, s.user_id INTO m
  FROM public.small_missions s WHERE s.id = r.mission_id;

  IF m.status IS DISTINCT FROM 'open' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'mission_closed');
  END IF;

  UPDATE public.mission_action_tokens SET used_at = now() WHERE id = r.id;

  SELECT id INTO v_response_id
  FROM public.small_mission_responses
  WHERE mission_id = r.mission_id AND responder_id = r.helper_id;

  IF v_response_id IS NULL THEN
    INSERT INTO public.small_mission_responses (mission_id, responder_id, message)
    VALUES (r.mission_id, r.helper_id, 'Je peux vous aider.')
    RETURNING id INTO v_response_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'response_id', v_response_id,
    'mission_id', r.mission_id,
    'mission_title', coalesce(m.title, ''),
    'helper_id', r.helper_id
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.consume_mission_action_token(text) TO service_role;

-- Fin des offres : plus aucune creation de mission_type 'offre'.
CREATE OR REPLACE FUNCTION public.validate_small_mission()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_texte text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.mission_type = 'offre'::mission_type_enum THEN
    RAISE EXCEPTION 'offer_creation_disabled'
      USING HINT = 'offer_creation_disabled',
            MESSAGE = 'Les offres ne se publient plus. Dites plutot ce que vous aimez faire dans votre profil, rubrique « Ce que je fais volontiers ».';
  END IF;

  IF NEW.duration_estimate IS NOT NULL AND NEW.duration_estimate NOT IN ('1-2h', 'half_day', 'several', 'weekend', 'day', 'few_days', 'week', 'two_weeks', 'month_plus') THEN
    RAISE EXCEPTION 'Invalid duration_estimate: %. Allowed values: 1-2h, half_day, several, weekend, day, few_days, week, two_weeks, month_plus', NEW.duration_estimate;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.date_needed IS NOT NULL AND NEW.date_needed < CURRENT_DATE THEN
    RAISE EXCEPTION 'date_needed cannot be in the past';
  END IF;

  IF NEW.title IS NOT NULL THEN NEW.title := public.strip_emojis(NEW.title); END IF;
  IF NEW.description IS NOT NULL THEN NEW.description := public.strip_emojis(NEW.description); END IF;
  IF NEW.exchange_offer IS NOT NULL THEN NEW.exchange_offer := public.strip_emojis(NEW.exchange_offer); END IF;

  v_texte := coalesce(NEW.title,'') || ' ' || coalesce(NEW.description,'') || ' ' || coalesce(NEW.exchange_offer,'');
  IF public.mutual_aid_money_mention(v_texte) THEN
    RAISE EXCEPTION 'money_in_mutual_aid'
      USING HINT = 'money_in_mutual_aid',
            MESSAGE = 'Ici on s''echange des services, jamais de l''argent. Proposez plutot ce que vous offrez en retour : un cafe, des oeufs du jardin, un coup de main quand vous pourrez.';
  END IF;

  RETURN NEW;
END;
$function$;

-- Meme garde-fou anti-argent sur « Ce que je fais volontiers ».
CREATE OR REPLACE FUNCTION public.validate_profile_helps_with()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.helps_with IS NOT NULL AND btrim(NEW.helps_with) <> '' THEN
    NEW.helps_with := public.strip_emojis(NEW.helps_with);
    IF public.mutual_aid_money_mention(NEW.helps_with) THEN
      RAISE EXCEPTION 'money_in_mutual_aid'
        USING HINT = 'money_in_mutual_aid',
              MESSAGE = 'Ici on s''echange des services, jamais de l''argent. Dites plutot ce que vous aimez faire pour les gens du coin.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_profile_helps_with ON public.profiles;
CREATE TRIGGER trg_validate_profile_helps_with
BEFORE INSERT OR UPDATE OF helps_with ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_profile_helps_with();
