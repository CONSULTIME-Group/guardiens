
CREATE OR REPLACE FUNCTION public.accept_application(p_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sit_id uuid;
  v_owner_id uuid;
  v_current_status application_status;
  v_sit_status sit_status;
  v_auto_rejected integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

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
    RETURNING 1
  )
  SELECT count(*) INTO v_auto_rejected FROM rej;

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
    'auto_rejected_count', v_auto_rejected
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_application(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_application(uuid) TO authenticated;

-- =====================================================================
-- BACKFILL DRY-RUN, ne pas exécuter sans validation Jérémie
-- Contexte : 1 application status='accepted' sur sit fddf8f90...
-- qui est actuellement 'archived'. Le passage à 'confirmed' n'est PAS
-- automatique car on ne sait pas si la garde a réellement eu lieu.
-- =====================================================================
-- SELECT a.id AS app_id, a.status AS app_status, s.id AS sit_id, s.status AS sit_status
--   FROM applications a JOIN sits s ON s.id = a.sit_id
--  WHERE a.status = 'accepted';
--
-- UPDATE sits
--    SET status = 'confirmed', accepting_applications = false, updated_at = now()
--  WHERE id = 'fddf8f90-706c-4d7d-9d59-4cb6044945e0'
--    AND status = 'archived';
