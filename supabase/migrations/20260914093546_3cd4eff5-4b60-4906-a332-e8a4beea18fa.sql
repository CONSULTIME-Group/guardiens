CREATE OR REPLACE FUNCTION public.enforce_mission_response_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pending int;
  v_cap int;
  v_cat text;
  v_places int;
BEGIN
  SELECT m.category::text, m.max_participants
    INTO v_cat, v_places
    FROM public.small_missions m
   WHERE m.id = NEW.mission_id;

  IF v_cat = 'projet' THEN
    v_cap := greatest(coalesce(v_places, 6) * 2, 10);
  ELSE
    v_cap := 5;
  END IF;

  SELECT count(*) INTO v_pending
    FROM public.small_mission_responses
   WHERE mission_id = NEW.mission_id
     AND status = 'pending';

  IF v_pending >= v_cap THEN
    RAISE EXCEPTION 'mission_response_cap_reached'
      USING ERRCODE = 'P0001', HINT = 'mission_response_cap_reached';
  END IF;

  RETURN NEW;
END;
$function$;