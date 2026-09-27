CREATE OR REPLACE VIEW public.public_mission_response_counts AS
 SELECT r.mission_id,
    (count(*))::integer AS response_count
   FROM (small_mission_responses r
     JOIN small_missions m ON ((m.id = r.mission_id)))
  WHERE ((m.status = 'open'::small_mission_status) AND (m.mission_type = 'besoin'::mission_type_enum) AND (m.moderation_hidden_at IS NULL) AND (m.hidden_at IS NULL)
    AND (r.status = ANY (ARRAY['pending'::small_mission_response_status, 'accepted'::small_mission_response_status])))
  GROUP BY r.mission_id;

-- Un membre qui a retiré sa réponse peut répondre à nouveau : la ligne retirée
-- (contrainte unique mission, membre) est effacée, puis l'insert normal repasse
-- par tous les contrôles (plafond, éligibilité, argent, notification).
CREATE OR REPLACE FUNCTION public.clear_my_withdrawn_mission_response(p_mission_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  DELETE FROM public.small_mission_responses
   WHERE mission_id = p_mission_id
     AND responder_id = auth.uid()
     AND status = 'withdrawn';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$function$;

REVOKE ALL ON FUNCTION public.clear_my_withdrawn_mission_response(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_my_withdrawn_mission_response(uuid) TO authenticated;