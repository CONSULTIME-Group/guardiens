-- Lot ERR404 (29/10/2026, rapport d'erreurs de pages du 22 au 29/10, option A validée par Jérémie).
-- 1) Une garde expirée dont la date de fin est dépassée reste lisible (HTTP 200, noindex côté page)
--    au lieu d'un 404. Une garde expirée à fin future ou sans date reste invisible (protège le
--    calendrier d'absence). Les brouillons et annulées restent privés.
-- 2) Les besoins d'entraide terminés ou clos sont lisibles par un visiteur via une vue dédiée.
--    public_small_missions garde son filtre « open » : listes, sitemap et accueil ne bougent pas.
-- 3) Ligne de test QA retirée de la production.

CREATE OR REPLACE FUNCTION public.get_public_sit(p_param text)
 RETURNS TABLE(id uuid, slug text, user_id uuid, property_id uuid, status text, title text, city text, country text, start_date date, end_date date, environments text[], daily_routine text, open_to text[], accepting_applications boolean, max_applications integer, specific_expectations text, owner_message text, flexible_dates boolean, flexibility_notes text, accepts_sitter_pets text, accepts_sitter_children text, published_at timestamp with time zone, cover_photo_url text, dates_hidden boolean)
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
      AND (
        sits.status::text = ANY (ARRAY['published','confirmed','in_progress','completed','archived'])
        -- Lot ERR404 : expirée ET passée (fin strictement antérieure à aujourd'hui).
        OR (sits.status::text = 'expired' AND sits.end_date IS NOT NULL AND sits.end_date < current_date)
        -- Lot X3a (A-04) : l'auteur lit sa propre annonce quel que soit son statut.
        OR (auth.uid() IS NOT NULL AND auth.uid() = sits.user_id)
      )
    LIMIT 1
  ), h AS (
    SELECT s.*,
      (
        s.status::text = ANY (ARRAY['confirmed','in_progress','completed','archived'])
        AND (s.end_date IS NULL OR s.end_date >= current_date)
        -- CORRECTIF 02/08/2026 : coalesce obligatoire. Pour un visiteur anonyme,
        -- auth.uid() est NULL, donc « auth.uid() = user_id » valait NULL, le OR
        -- valait NULL, et NOT NULL valait NULL : hide n'etait jamais vrai et les
        -- dates d absence, la routine, la description et le message d hote de
        -- toute garde confirmee etaient exposes a tout internaute.
        AND NOT COALESCE(
          auth.uid() = s.user_id
          OR EXISTS (
            SELECT 1 FROM public.applications a
            WHERE a.sit_id = s.id AND a.sitter_id = auth.uid() AND a.status = 'accepted'
          ),
          false
        )
      ) AS hide
    FROM s
  )
  SELECT
    h.id, h.slug, h.user_id, h.property_id, h.status::text, h.title, h.city, h.country,
    CASE WHEN h.hide THEN NULL ELSE h.start_date END,
    CASE WHEN h.hide THEN NULL ELSE h.end_date END,
    h.environments::text[],
    CASE WHEN h.hide THEN NULL ELSE h.daily_routine END,
    h.open_to::text[], h.accepting_applications, h.max_applications,
    CASE WHEN h.hide THEN NULL ELSE h.specific_expectations END,
    CASE WHEN h.hide THEN NULL ELSE h.owner_message END,
    h.flexible_dates,
    CASE WHEN h.hide THEN NULL ELSE h.flexibility_notes END,
    h.accepts_sitter_pets, h.accepts_sitter_children, h.published_at, h.cover_photo_url,
    h.hide
  FROM h;
$function$;

CREATE OR REPLACE VIEW public.public_closed_small_missions AS
 SELECT id,
    user_id,
    slug,
    title,
    description,
    category,
    exchange_offer,
    city,
    postal_code,
    round(latitude, 2) AS latitude,
    round(longitude, 2) AS longitude,
    date_needed,
    end_date,
    duration_estimate,
    status,
    mission_type,
    photos,
    pet_species,
    pet_size,
    created_at,
    max_participants,
    accepting_applications,
    hebergement,
    repas,
    ce_que_vous_apprendrez,
    nature_projet,
    savoir_faire_attendus,
    savoir_faire_transmis,
    offre,
    mois_accueil,
    sit_mode
   FROM small_missions
  WHERE ((status IN ('completed'::small_mission_status, 'cancelled'::small_mission_status)) AND (moderation_hidden_at IS NULL) AND (hidden_at IS NULL));

GRANT SELECT ON public.public_closed_small_missions TO anon;
GRANT SELECT ON public.public_closed_small_missions TO authenticated;

DELETE FROM public.seo_city_pages WHERE slug = 'test-ville-qa-guardiens' AND published = false;
