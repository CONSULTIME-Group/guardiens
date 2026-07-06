CREATE OR REPLACE FUNCTION public.claim_mission_event(_event_type text, _mission_id uuid, _target_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_key text;
  v_inserted text;
BEGIN
  v_key := 'mission-event-' || _event_type
        || '-' || COALESCE(_mission_id::text, 'none')
        || '-' || COALESCE(_target_id::text, 'none')
        || '-' || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD');

  INSERT INTO public.mission_event_idempotency (event_key, event_type, mission_id, target_id)
  VALUES (v_key, _event_type, _mission_id, _target_id)
  ON CONFLICT (event_key) DO NOTHING
  RETURNING event_key INTO v_inserted;

  RETURN v_inserted IS NOT NULL;
END;
$function$;