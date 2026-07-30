CREATE OR REPLACE FUNCTION public.get_public_sit(p_param text)
RETURNS TABLE (
  id uuid,
  slug text,
  user_id uuid,
  property_id uuid,
  status text,
  title text,
  city text,
  country text,
  start_date date,
  end_date date,
  environments text[],
  daily_routine text,
  open_to text[],
  accepting_applications boolean,
  max_applications integer,
  specific_expectations text,
  owner_message text,
  flexible_dates boolean,
  dates_hidden boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH s AS (
    SELECT *
    FROM public.sits
    WHERE (
      CASE
        WHEN p_param ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN sits.id = p_param::uuid
        ELSE sits.slug = p_param
      END
    )
      AND sits.status::text = ANY (ARRAY['published','confirmed','in_progress','completed','archived'])
    LIMIT 1
  ), h AS (
    SELECT s.*,
      (
        s.status::text = ANY (ARRAY['confirmed','in_progress','completed','archived'])
        AND (s.end_date IS NULL OR s.end_date >= current_date)
        AND auth.uid() IS NULL
      ) AS hide
    FROM s
  )
  SELECT
    h.id,
    h.slug,
    h.user_id,
    h.property_id,
    h.status::text,
    h.title,
    h.city,
    h.country,
    CASE WHEN h.hide THEN NULL ELSE h.start_date END,
    CASE WHEN h.hide THEN NULL ELSE h.end_date END,
    h.environments::text[],
    h.daily_routine,
    h.open_to::text[],
    h.accepting_applications,
    h.max_applications,
    h.specific_expectations,
    h.owner_message,
    h.flexible_dates,
    h.hide
  FROM h;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_sit(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_sit(text) TO anon, authenticated;