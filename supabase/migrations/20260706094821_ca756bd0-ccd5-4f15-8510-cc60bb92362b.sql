
-- 1. analytics_events : durcir l'insert anonyme
DROP POLICY IF EXISTS "Anonymous can insert anonymous events" ON public.analytics_events;
CREATE POLICY "Anonymous can insert anonymous events"
ON public.analytics_events
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
  AND event_type ~ '^[a-z0-9_]{1,64}$'
  AND (source IS NULL OR char_length(source) <= 100)
  AND (metadata IS NULL OR pg_column_size(metadata) < 2048)
);

-- 2. email_campaign_events : supprimer l'insert public, imposer scoping + limites
DROP POLICY IF EXISTS "Anyone can insert campaign events" ON public.email_campaign_events;

CREATE POLICY "Authenticated can insert own campaign events"
ON public.email_campaign_events
FOR INSERT
TO authenticated
WITH CHECK (
  event_type IS NOT NULL
  AND char_length(event_type) BETWEEN 1 AND 50
  AND (user_id IS NULL OR user_id = auth.uid())
  AND utm_campaign IS NOT NULL
  AND char_length(utm_campaign) BETWEEN 1 AND 100
  AND (utm_content IS NULL OR char_length(utm_content) <= 100)
  AND (utm_source IS NULL OR char_length(utm_source) <= 100)
  AND (utm_medium IS NULL OR char_length(utm_medium) <= 100)
  AND (path IS NULL OR char_length(path) <= 500)
);

CREATE POLICY "Anon can insert anonymous campaign events"
ON public.email_campaign_events
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
  AND mission_id IS NULL
  AND event_type IS NOT NULL
  AND char_length(event_type) BETWEEN 1 AND 50
  AND utm_campaign IS NOT NULL
  AND char_length(utm_campaign) BETWEEN 1 AND 100
  AND (utm_content IS NULL OR char_length(utm_content) <= 100)
  AND (utm_source IS NULL OR char_length(utm_source) <= 100)
  AND (utm_medium IS NULL OR char_length(utm_medium) <= 100)
  AND (path IS NULL OR char_length(path) <= 500)
);

-- 3. notifications : supprimer l'insert direct par gardien, remplacer par une RPC SECURITY DEFINER
DROP POLICY IF EXISTS "Sitters can notify owners of new applications" ON public.notifications;

CREATE OR REPLACE FUNCTION public.notify_owner_of_new_application(_application_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sitter_id uuid;
  v_sit_id uuid;
  v_owner_id uuid;
  v_sit_title text;
  v_sitter_first_name text;
  v_sitter_avatar text;
  v_notification_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT a.sitter_id, a.sit_id, s.user_id, s.title
    INTO v_sitter_id, v_sit_id, v_owner_id, v_sit_title
  FROM public.applications a
  JOIN public.sits s ON s.id = a.sit_id
  WHERE a.id = _application_id;

  IF v_sitter_id IS NULL THEN
    RAISE EXCEPTION 'application not found';
  END IF;

  IF v_sitter_id <> auth.uid() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT first_name, avatar_url
    INTO v_sitter_first_name, v_sitter_avatar
  FROM public.profiles
  WHERE id = v_sitter_id;

  v_sitter_first_name := COALESCE(NULLIF(trim(v_sitter_first_name), ''), 'Un gardien');
  v_sit_title := COALESCE(NULLIF(trim(v_sit_title), ''), 'votre annonce');

  INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
  VALUES (
    v_owner_id,
    'new_application',
    'Nouvelle candidature',
    v_sitter_first_name || ' a postulé à « ' || v_sit_title || ' ».',
    '/sits/' || v_sit_id::text || '#candidatures',
    v_sitter_first_name,
    v_sitter_avatar
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_owner_of_new_application(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_owner_of_new_application(uuid) TO authenticated;
