-- 1. Detection des annonces publiees dont la mise en relation a reussi
--    mais n'a jamais ete officialisee.
CREATE OR REPLACE FUNCTION public.detect_unconfirmed_sits()
RETURNS TABLE(
  sit_id uuid,
  sit_title text,
  sit_slug text,
  start_date date,
  end_date date,
  days_until_start integer,
  owner_id uuid,
  owner_first_name text,
  owner_email text,
  sitter_first_names text[],
  discussing_count integer,
  last_message_at timestamptz,
  urgency text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH qualifying AS (
    SELECT
      a.sit_id,
      a.sitter_id,
      sp.first_name AS sitter_first_name,
      lm.last_at
    FROM public.applications a
    JOIN public.sits s ON s.id = a.sit_id AND s.status = 'published'
    JOIN public.profiles sp ON sp.id = a.sitter_id
    JOIN public.conversations c ON c.sit_id = a.sit_id AND c.sitter_id = a.sitter_id
    CROSS JOIN LATERAL (
      SELECT
        max(m.created_at) AS last_at,
        bool_or(m.sender_id = c.owner_id) AS owner_wrote,
        bool_or(m.sender_id = c.sitter_id) AS sitter_wrote
      FROM public.messages m
      WHERE m.conversation_id = c.id
        AND m.is_system = false
        AND m.moderation_hidden_at IS NULL
    ) lm
    WHERE a.status IN ('pending', 'viewed', 'discussing')
      AND lm.owner_wrote
      AND lm.sitter_wrote
  )
  SELECT
    s.id,
    s.title,
    s.slug,
    s.start_date,
    s.end_date,
    CASE WHEN s.start_date IS NULL THEN NULL
         ELSE (s.start_date - CURRENT_DATE)::int END,
    s.user_id,
    op.first_name,
    u.email::text,
    array_agg(DISTINCT q.sitter_first_name) FILTER (WHERE q.sitter_first_name IS NOT NULL),
    count(*)::int,
    max(q.last_at),
    CASE
      WHEN s.start_date IS NOT NULL AND (s.start_date - CURRENT_DATE) <= 14 THEN 'imminent'
      ELSE 'stale'
    END
  FROM qualifying q
  JOIN public.sits s ON s.id = q.sit_id
  JOIN public.profiles op ON op.id = s.user_id
  JOIN auth.users u ON u.id = s.user_id
  WHERE u.email IS NOT NULL
  GROUP BY s.id, s.title, s.slug, s.start_date, s.end_date, s.user_id, op.first_name, u.email
  HAVING max(q.last_at) < now() - interval '3 days'
      OR (s.start_date IS NOT NULL AND (s.start_date - CURRENT_DATE) <= 14)
$function$;

REVOKE ALL ON FUNCTION public.detect_unconfirmed_sits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.detect_unconfirmed_sits() TO service_role;

-- 2. Resolution automatique du signal des que le sit est confirme
--    ou quitte l'etat publie. Meme modele que resolve_pending_application_signal.
CREATE OR REPLACE FUNCTION public.resolve_owner_sit_unconfirmed_signal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'published' THEN
    UPDATE public.admin_signals
    SET resolved_at = now(),
        action_taken = COALESCE(action_taken, 'auto_resolved')
    WHERE signal_type = 'owner_sit_unconfirmed'
      AND entity_id = NEW.id
      AND resolved_at IS NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_resolve_owner_sit_unconfirmed ON public.sits;
CREATE TRIGGER trg_resolve_owner_sit_unconfirmed
AFTER UPDATE OF status ON public.sits
FOR EACH ROW EXECUTE FUNCTION public.resolve_owner_sit_unconfirmed_signal();

-- 3. Le compteur "en attente de decision" doit inclure viewed et discussing.
CREATE OR REPLACE FUNCTION public.get_owner_sits_enriched(p_owner uuid)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT to_jsonb(s.*)
    || jsonb_build_object(
      'properties', (
        SELECT jsonb_build_object(
          'type', p.type,
          'environment', p.environment,
          'photos', p.photos,
          'user_id', p.user_id
        )
        FROM public.properties p WHERE p.id = s.property_id
      ),
      'application_count', (
        SELECT count(*)::int FROM public.applications a WHERE a.sit_id = s.id
      ),
      'pending_application_count', (
        SELECT count(*)::int FROM public.applications a
        WHERE a.sit_id = s.id AND a.status IN ('pending', 'viewed', 'discussing')
      ),
      'accepted_sitter', (
        SELECT jsonb_build_object(
          'id', pr.id,
          'first_name', pr.first_name,
          'avatar_url', pr.avatar_url,
          'city', pr.city
        )
        FROM public.applications a
        JOIN public.profiles pr ON pr.id = a.sitter_id
        WHERE a.sit_id = s.id AND a.status = 'accepted'
        LIMIT 1
      ),
      'pets', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('name', pt.name, 'species', pt.species))
         FROM public.pets pt WHERE pt.property_id = s.property_id),
        '[]'::jsonb
      ),
      'has_reviewed', EXISTS (
        SELECT 1 FROM public.reviews r
        WHERE r.sit_id = s.id AND r.reviewer_id = p_owner
      )
    )
  FROM public.sits s
  WHERE s.user_id = p_owner
    AND s.user_id = auth.uid()
  ORDER BY s.start_date DESC NULLS LAST;
$function$;