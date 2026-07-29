CREATE OR REPLACE FUNCTION public.detect_stale_drafts()
RETURNS TABLE (
  sit_id uuid,
  sit_title text,
  city text,
  start_date date,
  owner_id uuid,
  owner_first_name text,
  owner_email text,
  days_since_created integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.title,
    s.city,
    s.start_date::date,
    s.user_id,
    owner.first_name,
    owner.email,
    (EXTRACT(EPOCH FROM (now() - s.created_at))::integer / 86400)
  FROM sits s
  JOIN profiles owner ON owner.id = s.user_id
  WHERE s.status = 'draft'::sit_status
    AND s.created_at < now() - interval '48 hours'
    AND (s.start_date IS NULL OR s.start_date::date > current_date)
    AND owner.email IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM sits p
      WHERE p.user_id = s.user_id
        AND p.status IN ('published'::sit_status, 'confirmed'::sit_status, 'completed'::sit_status)
    )
  ORDER BY s.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.detect_stale_drafts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.detect_stale_drafts() TO service_role;
GRANT EXECUTE ON FUNCTION public.detect_stale_drafts() TO authenticated;