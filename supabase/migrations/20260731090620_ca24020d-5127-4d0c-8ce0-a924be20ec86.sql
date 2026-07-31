-- ============================================================
-- RETOUR ARRIERE IMMEDIAT, definition exacte de la policy remplacee :
--
-- CREATE POLICY "Public sits are readable by anon"
--   ON public.sits
--   FOR SELECT
--   TO anon
--   USING (status = ANY (ARRAY['published'::sit_status, 'confirmed'::sit_status,
--                              'in_progress'::sit_status, 'completed'::sit_status,
--                              'archived'::sit_status]));
-- ============================================================

DROP POLICY IF EXISTS "Public sits are readable by anon" ON public.sits;

CREATE POLICY "Public sits are readable by anon"
  ON public.sits
  FOR SELECT
  TO anon
  USING (status = 'published'::sit_status);

-- Vue reduite des gardes fermees : signal de vie pour la grille anonyme.
-- Aucune date, aucun texte libre, aucune coordonnee.
-- user_id est conserve, il est deja public (profils publics) et sert au
-- rattachement de l'annonce a son proprietaire.
DROP VIEW IF EXISTS public.public_closed_sits;

CREATE VIEW public.public_closed_sits AS
  SELECT
    s.id,
    s.user_id,
    s.slug,
    s.title,
    s.city,
    s.status::text AS status,
    s.cover_photo_url
  FROM public.sits s
  WHERE s.status = ANY (ARRAY['confirmed'::sit_status, 'in_progress'::sit_status,
                              'completed'::sit_status, 'archived'::sit_status])
    AND s.moderation_hidden_at IS NULL;

GRANT SELECT ON public.public_closed_sits TO anon, authenticated;

-- get_public_sit alignee : le masquage couvre desormais les champs libres.
CREATE OR REPLACE FUNCTION public.get_public_sit(p_param text)
RETURNS TABLE(id uuid, slug text, user_id uuid, property_id uuid, status text, title text, city text, country text, start_date date, end_date date, environments text[], daily_routine text, open_to text[], accepting_applications boolean, max_applications integer, specific_expectations text, owner_message text, flexible_dates boolean, accepts_sitter_pets text, accepts_sitter_children text, dates_hidden boolean)
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
    CASE WHEN h.hide THEN NULL ELSE h.daily_routine END,
    h.open_to::text[],
    h.accepting_applications,
    h.max_applications,
    CASE WHEN h.hide THEN NULL ELSE h.specific_expectations END,
    CASE WHEN h.hide THEN NULL ELSE h.owner_message END,
    h.flexible_dates,
    h.accepts_sitter_pets,
    h.accepts_sitter_children,
    h.hide
  FROM h;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_sit(text) TO anon, authenticated, service_role;