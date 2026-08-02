DROP FUNCTION IF EXISTS public.get_public_sit(text);

CREATE OR REPLACE FUNCTION public.get_public_sit(p_param text)
 RETURNS TABLE(id uuid, slug text, user_id uuid, property_id uuid, status text, title text, city text, country text, start_date date, end_date date, environments text[], daily_routine text, open_to text[], accepting_applications boolean, max_applications integer, specific_expectations text, owner_message text, flexible_dates boolean, flexibility_notes text, accepts_sitter_pets text, accepts_sitter_children text, dates_hidden boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        AND NOT (
          auth.uid() = s.user_id
          OR EXISTS (
            SELECT 1 FROM public.applications a
            WHERE a.sit_id = s.id AND a.sitter_id = auth.uid() AND a.status = 'accepted'
          )
        )
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
    CASE WHEN h.hide THEN NULL ELSE h.daily_routine END,
    h.open_to::text[],
    h.accepting_applications,
    h.max_applications,
    CASE WHEN h.hide THEN NULL ELSE h.specific_expectations END,
    CASE WHEN h.hide THEN NULL ELSE h.owner_message END,
    h.flexible_dates,
    CASE WHEN h.hide THEN NULL ELSE h.flexibility_notes END,
    h.accepts_sitter_pets,
    h.accepts_sitter_children,
    h.hide
  FROM h;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_sit(text) TO anon, authenticated, service_role;