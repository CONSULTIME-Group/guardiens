
CREATE OR REPLACE FUNCTION public.get_owner_sits_enriched(p_owner uuid)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
        WHERE a.sit_id = s.id AND a.status = 'pending'
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
$$;

REVOKE ALL ON FUNCTION public.get_owner_sits_enriched(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_sits_enriched(uuid) TO authenticated;
