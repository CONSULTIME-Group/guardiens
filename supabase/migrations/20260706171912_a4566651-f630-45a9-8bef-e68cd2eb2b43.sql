
CREATE OR REPLACE FUNCTION public.get_activity_since_last_visit()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_last_visit timestamptz;
  v_role text;
  v_new_messages int := 0;
  v_new_applications int := 0;
  v_new_sits_nearby int := 0;
  v_new_intl_sitters int := 0;
  v_new_intl_sits int := 0;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'new_messages', 0,
      'new_applications', 0,
      'new_sits_nearby', 0,
      'new_intl_sitters', 0,
      'new_intl_sits', 0,
      'is_first_visit', true
    );
  END IF;

  SELECT last_dashboard_visit_at, role
  INTO v_last_visit, v_role
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_last_visit IS NULL THEN
    UPDATE public.profiles
    SET last_dashboard_visit_at = now()
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
      'new_messages', 0,
      'new_applications', 0,
      'new_sits_nearby', 0,
      'new_intl_sitters', 0,
      'new_intl_sits', 0,
      'is_first_visit', true
    );
  END IF;

  SELECT COUNT(*)::int INTO v_new_messages
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  WHERE m.created_at > v_last_visit
    AND m.sender_id <> v_user_id
    AND (c.owner_id = v_user_id OR c.sitter_id = v_user_id);

  IF v_role IN ('owner', 'both') THEN
    SELECT COUNT(*)::int INTO v_new_applications
    FROM public.applications a
    JOIN public.sits s ON s.id = a.sit_id
    WHERE s.user_id = v_user_id
      AND a.created_at > v_last_visit;
  END IF;

  IF v_role IN ('sitter', 'both') THEN
    SELECT COUNT(*)::int INTO v_new_sits_nearby
    FROM public.sits s
    WHERE s.status = 'published'
      AND s.created_at > v_last_visit
      AND s.user_id <> v_user_id;

    SELECT COUNT(*)::int INTO v_new_intl_sits
    FROM public.sits s
    WHERE s.status = 'published'
      AND s.created_at > v_last_visit
      AND s.user_id <> v_user_id
      AND COALESCE(s.country, 'FR') <> 'FR';
  END IF;

  IF v_role IN ('owner', 'both') THEN
    SELECT COUNT(*)::int INTO v_new_intl_sitters
    FROM public.profiles p
    WHERE p.created_at > v_last_visit
      AND p.role IN ('sitter', 'both')
      AND p.id <> v_user_id;
  END IF;

  UPDATE public.profiles
  SET last_dashboard_visit_at = now()
  WHERE id = v_user_id;

  v_result := jsonb_build_object(
    'new_messages', v_new_messages,
    'new_applications', v_new_applications,
    'new_sits_nearby', v_new_sits_nearby,
    'new_intl_sitters', v_new_intl_sitters,
    'new_intl_sits', v_new_intl_sits,
    'is_first_visit', false
  );

  RETURN v_result;
END;
$function$;
