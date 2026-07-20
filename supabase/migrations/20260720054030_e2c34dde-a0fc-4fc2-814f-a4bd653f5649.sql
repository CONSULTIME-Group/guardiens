
CREATE OR REPLACE FUNCTION public.users_with_journey_for_sequence(
  _sequence_key text,
  _user_ids uuid[],
  _started_since timestamptz DEFAULT NULL
) RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT uj.user_id
  FROM public.user_journeys uj
  WHERE uj.sequence_key = _sequence_key
    AND uj.user_id = ANY(_user_ids)
    AND (_started_since IS NULL OR uj.started_at >= _started_since)
$$;

REVOKE ALL ON FUNCTION public.users_with_journey_for_sequence(text, uuid[], timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.users_with_journey_for_sequence(text, uuid[], timestamptz) TO service_role;
