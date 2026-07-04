CREATE OR REPLACE FUNCTION public.archive_sit(p_sit_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid;
  v_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = 'P0001';
  END IF;

  SELECT user_id, status::text INTO v_owner, v_status
  FROM public.sits WHERE id = p_sit_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'SIT_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  IF v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = 'P0001';
  END IF;
  IF v_status NOT IN ('completed','cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATUS:%', v_status USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.allow_internal_profile_update', 'on', true);
  UPDATE public.sits SET status = 'archived' WHERE id = p_sit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_sit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_sit(uuid) TO authenticated;
