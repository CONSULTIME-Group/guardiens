-- Lot L1 (10/10/2026) : pays et département du lieu de garde sur la vue réduite des annonces fermées, pour un filtre France strict. Ajout de colonnes en fin de vue, aucune date ni coordonnée.
CREATE OR REPLACE VIEW public.public_closed_sits AS
 SELECT id, user_id, slug, title, city, (status)::text AS status, cover_photo_url,
    nullif(upper(trim(country)), '') AS country, departement_code
   FROM sits s
  WHERE status = ANY (ARRAY['confirmed'::sit_status, 'in_progress'::sit_status, 'completed'::sit_status, 'archived'::sit_status]) AND moderation_hidden_at IS NULL;