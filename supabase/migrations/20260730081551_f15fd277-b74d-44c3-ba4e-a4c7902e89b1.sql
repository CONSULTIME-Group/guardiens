ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS decline_reason text,
  ADD COLUMN IF NOT EXISTS decline_variant smallint,
  ADD COLUMN IF NOT EXISTS declined_at timestamptz;

CREATE OR REPLACE FUNCTION public.consume_application_action_token(p_token text, p_reason text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_prior int;
  v_sitter_email text;
  v_owner_name text;
  v_reason text;
  v_sit_id uuid;
  v_owner_id uuid;
  v_used int[];
  v_last int;
  v_variant int;
  i int;
BEGIN
  SELECT * INTO r
  FROM public.application_action_tokens
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;
  IF r.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_used');
  END IF;
  IF r.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  IF r.action = 'thinking' THEN
    SELECT count(*) INTO v_prior
    FROM public.application_action_tokens
    WHERE application_id = r.application_id
      AND action = 'thinking'
      AND used_at IS NOT NULL;
    IF v_prior > 0 THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'already_used');
    END IF;
  END IF;

  UPDATE public.application_action_tokens
  SET used_at = now()
  WHERE id = r.id;

  PERFORM set_config('app.quick_action', '1', true);

  IF r.action = 'decline' THEN
    v_reason := CASE
      WHEN p_reason IN ('other_chosen','dates_changed','not_right_time','different_profile') THEN p_reason
      ELSE 'other_chosen'
    END;

    SELECT a.sit_id, s.user_id INTO v_sit_id, v_owner_id
    FROM public.applications a
    JOIN public.sits s ON s.id = a.sit_id
    WHERE a.id = r.application_id;

    SELECT coalesce(array_agg(a.decline_variant), '{}')
    INTO v_used
    FROM public.applications a
    WHERE a.sit_id = v_sit_id
      AND a.decline_variant IS NOT NULL
      AND a.decline_reason = v_reason;

    SELECT a.decline_variant INTO v_last
    FROM public.applications a
    JOIN public.sits s ON s.id = a.sit_id
    WHERE s.user_id = v_owner_id
      AND a.decline_variant IS NOT NULL
      AND a.declined_at IS NOT NULL
    ORDER BY a.declined_at DESC
    LIMIT 1;

    v_variant := NULL;
    FOR i IN 0..2 LOOP
      IF NOT (i = ANY (v_used)) AND (v_last IS NULL OR i <> v_last) THEN
        v_variant := i;
        EXIT;
      END IF;
    END LOOP;
    IF v_variant IS NULL THEN
      FOR i IN 0..2 LOOP
        IF NOT (i = ANY (v_used)) THEN
          v_variant := i;
          EXIT;
        END IF;
      END LOOP;
    END IF;
    IF v_variant IS NULL THEN
      v_variant := (coalesce(v_last, -1) + 1) % 3;
    END IF;

    UPDATE public.applications
    SET status = 'rejected'::application_status,
        decline_reason = v_reason,
        decline_variant = v_variant,
        declined_at = now()
    WHERE id = r.application_id
      AND status IN ('pending','viewed','discussing');
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'already_answered');
    END IF;
  END IF;

  PERFORM set_config('app.quick_action', '0', true);

  SELECT ps.email, po.first_name
  INTO v_sitter_email, v_owner_name
  FROM public.applications a
  JOIN public.profiles ps ON ps.id = a.sitter_id
  JOIN public.sits s ON s.id = a.sit_id
  LEFT JOIN public.profiles po ON po.id = s.user_id
  WHERE a.id = r.application_id;

  RETURN jsonb_build_object(
    'ok', true,
    'action', r.action,
    'application_id', r.application_id,
    'decline_reason', v_reason,
    'decline_variant', v_variant,
    'sitter_email', v_sitter_email,
    'owner_first_name', coalesce(v_owner_name, ''),
    'sit_title', (SELECT coalesce(s.title, '') FROM public.applications a JOIN public.sits s ON s.id = a.sit_id WHERE a.id = r.application_id),
    'sitter_first_name', (SELECT coalesce(p.first_name, '') FROM public.applications a JOIN public.profiles p ON p.id = a.sitter_id WHERE a.id = r.application_id),
    'sit_city', (SELECT coalesce(s.city, '') FROM public.applications a JOIN public.sits s ON s.id = a.sit_id WHERE a.id = r.application_id)
  );
END;
$function$;