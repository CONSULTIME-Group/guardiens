-- 1. Colonne last_dashboard_visit_at sur profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_dashboard_visit_at timestamptz;

-- 2. RPC get_activity_since_last_visit
-- Renvoie les compteurs d'activité depuis la dernière visite du dashboard,
-- puis met à jour last_dashboard_visit_at à now().
CREATE OR REPLACE FUNCTION public.get_activity_since_last_visit()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Première visite : pas de digest, on pose juste le timestamp
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

  -- Nouveaux messages reçus depuis la dernière visite
  SELECT COUNT(*)::int INTO v_new_messages
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  WHERE m.created_at > v_last_visit
    AND m.sender_id <> v_user_id
    AND (c.owner_id = v_user_id OR c.sitter_id = v_user_id);

  -- Owner : nouvelles candidatures sur ses sits
  IF v_role IN ('owner', 'both') THEN
    SELECT COUNT(*)::int INTO v_new_applications
    FROM public.applications a
    JOIN public.sits s ON s.id = a.sit_id
    WHERE s.owner_id = v_user_id
      AND a.created_at > v_last_visit;
  END IF;

  -- Sitter : nouveaux sits publiés depuis la dernière visite (tous, pas de géo ici)
  IF v_role IN ('sitter', 'both') THEN
    SELECT COUNT(*)::int INTO v_new_sits_nearby
    FROM public.sits s
    WHERE s.status = 'published'
      AND s.created_at > v_last_visit
      AND s.owner_id <> v_user_id;

    -- Nouveaux sits internationaux (hors France) depuis la dernière visite
    SELECT COUNT(*)::int INTO v_new_intl_sits
    FROM public.sits s
    WHERE s.status = 'published'
      AND s.created_at > v_last_visit
      AND s.owner_id <> v_user_id
      AND COALESCE(s.country, 'FR') <> 'FR';
  END IF;

  -- Owner : nouveaux gardiens inscrits (tous rôles)
  IF v_role IN ('owner', 'both') THEN
    SELECT COUNT(*)::int INTO v_new_intl_sitters
    FROM public.profiles p
    WHERE p.created_at > v_last_visit
      AND p.role IN ('sitter', 'both')
      AND p.id <> v_user_id;
  END IF;

  -- Update last_dashboard_visit_at
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
$$;

GRANT EXECUTE ON FUNCTION public.get_activity_since_last_visit() TO authenticated;