CREATE OR REPLACE FUNCTION public.accept_application(p_application_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sit_id uuid;
  v_owner_id uuid;
  v_current_status application_status;
  v_sit_status sit_status;
  v_auto_rejected integer := 0;
  v_rejected_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.via_accept_rpc', '1', true);

  SELECT a.sit_id, a.status, s.user_id, s.status
    INTO v_sit_id, v_current_status, v_owner_id, v_sit_status
  FROM applications a
  JOIN sits s ON s.id = a.sit_id
  WHERE a.id = p_application_id;

  IF v_sit_id IS NULL THEN
    RAISE EXCEPTION 'application_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  IF v_current_status NOT IN ('pending', 'viewed', 'discussing') THEN
    RAISE EXCEPTION 'application_not_pending: %', v_current_status USING ERRCODE = '22023';
  END IF;

  IF v_sit_status IN ('confirmed', 'in_progress', 'completed', 'cancelled', 'archived') THEN
    RAISE EXCEPTION 'sit_not_open: %', v_sit_status USING ERRCODE = '22023';
  END IF;

  UPDATE applications SET status = 'accepted' WHERE id = p_application_id;

  WITH rej AS (
    UPDATE applications
       SET status = 'rejected'
     WHERE sit_id = v_sit_id
       AND id <> p_application_id
       AND status IN ('pending', 'viewed', 'discussing')
    RETURNING sitter_id
  )
  SELECT array_agg(sitter_id), count(*) INTO v_rejected_ids, v_auto_rejected FROM rej;

  v_rejected_ids := COALESCE(v_rejected_ids, ARRAY[]::uuid[]);

  UPDATE sits
     SET status = 'confirmed',
         accepting_applications = false,
         updated_at = now()
   WHERE id = v_sit_id;

  BEGIN
    INSERT INTO sit_status_history (sit_id, old_status, new_status, changed_by, reason)
    VALUES (v_sit_id, v_sit_status::text, 'confirmed', auth.uid(), 'application_accepted');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'sit_id', v_sit_id,
    'accepted_application_id', p_application_id,
    'auto_rejected_count', v_auto_rejected,
    'auto_rejected_sitter_ids', to_jsonb(v_rejected_ids)
  );
END;
$function$;