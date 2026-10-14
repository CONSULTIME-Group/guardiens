-- Lot A4 : sûreté et exploitation d'Alma (audit en arène du 14/10/2026).
-- Rejouable. Aucune donnée réécrite.
--
-- 1. alma_reserve_turn : réserve un tour d'Alma AVANT l'appel au modèle.
--    Verrou consultatif par membre et par compteur, jour de Paris, insertion
--    d'une ligne « reserved » qu'alma-chat ou alma-transcribe complète
--    ensuite. Compteurs : « chat » (30 par jour, ALMA_CHAT_DAILY_LIMIT) et
--    « transcription » (20 par jour, décision de Jérémie du 14/10/2026),
--    séparés par classification->>'kind'. service_role seul.
-- 2. alma_replay_runs.version : version d'Alma (ALMA_VERSION) servie pendant
--    le rejeu, lue par l'onglet Pilotage (« Rejeu à refaire »).

CREATE OR REPLACE FUNCTION public.alma_reserve_turn(
  p_user_id uuid,
  p_kind text,
  p_limit integer,
  p_row jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_start timestamptz := (date_trunc('day', now() AT TIME ZONE 'Europe/Paris')) AT TIME ZONE 'Europe/Paris';
  v_used integer;
  v_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_kind IS NULL OR p_kind NOT IN ('chat', 'transcription') OR p_limit IS NULL OR p_limit < 0 THEN
    RAISE EXCEPTION 'alma_reserve_turn: paramètres invalides' USING ERRCODE = '22023';
  END IF;

  -- Un seul compte à la fois par membre et par compteur : 35 appels
  -- simultanés donnent exactement p_limit réservations.
  PERFORM pg_advisory_xact_lock(hashtextextended('alma_reserve_turn:' || p_kind || ':' || p_user_id::text, 0));

  SELECT count(*) INTO v_used
  FROM public.alma_conversations c
  WHERE c.user_id = p_user_id
    AND c.created_at >= v_start
    AND CASE WHEN p_kind = 'transcription'
             THEN c.classification->>'kind' = 'transcription'
             ELSE (c.classification->>'kind') IS DISTINCT FROM 'transcription' END;

  IF v_used >= p_limit THEN
    RETURN jsonb_build_object('ok', false, 'used', v_used);
  END IF;

  INSERT INTO public.alma_conversations (user_id, surface, active_role, input_mode, question, page_path, refusal_reason, classification)
  VALUES (
    p_user_id,
    coalesce(nullif(left(p_row->>'surface', 60), ''), 'unknown'),
    coalesce(nullif(left(p_row->>'active_role', 20), ''), 'sitter'),
    left(p_row->>'input_mode', 20),
    left(p_row->>'question', 2000),
    left(p_row->>'page_path', 200),
    'reserved',
    CASE WHEN jsonb_typeof(p_row->'classification') = 'object' THEN p_row->'classification' ELSE '{}'::jsonb END
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'used', v_used + 1);
END;
$function$;

REVOKE ALL ON FUNCTION public.alma_reserve_turn(uuid, text, integer, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.alma_reserve_turn(uuid, text, integer, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.alma_reserve_turn(uuid, text, integer, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.alma_reserve_turn(uuid, text, integer, jsonb) TO service_role;

ALTER TABLE public.alma_replay_runs ADD COLUMN IF NOT EXISTS version text;
COMMENT ON COLUMN public.alma_replay_runs.version IS 'Lot A4 : ALMA_VERSION servie par alma-chat pendant le rejeu (replay_meta.version).';

-- Contrôles après application (lecture seule) :
--   SELECT has_function_privilege('anon', 'public.alma_reserve_turn(uuid,text,integer,jsonb)', 'EXECUTE');          -- false
--   SELECT has_function_privilege('authenticated', 'public.alma_reserve_turn(uuid,text,integer,jsonb)', 'EXECUTE'); -- false
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'alma_replay_runs' AND column_name = 'version'; -- 1 ligne
