-- Ajoute special_needs à la vue publique des animaux (colonne ajoutée en fin
-- de liste, CREATE OR REPLACE VIEW l'exige). Les droits et la définition de
-- filtrage (annonces publiées ou archivées, non masquées) sont inchangés.
CREATE OR REPLACE VIEW public.public_pets AS
SELECT id,
    property_id,
    species,
    breed,
    name,
    age,
    photo_url,
    "character",
    activity_level,
    alone_duration,
    walk_duration,
    special_needs
   FROM pets p
  WHERE (EXISTS ( SELECT 1
           FROM sits s
          WHERE s.property_id = p.property_id AND (s.status = ANY (ARRAY['published'::sit_status, 'archived'::sit_status])) AND s.moderation_hidden_at IS NULL));

-- Réaffirme les droits de lecture (idempotent, conservés par OR REPLACE).
GRANT SELECT ON public.public_pets TO anon;
GRANT SELECT ON public.public_pets TO authenticated;
GRANT ALL ON public.public_pets TO service_role;

COMMENT ON VIEW public.public_pets IS 'Animaux visibles sur les fiches annonces publiques. special_needs exposé depuis le 20/08/2026 : consignes de soin publiées volontairement par le propriétaire, nécessaires au critère besoins spéciaux du score d''affinité pour tout visiteur (y compris anonyme). Vérifié sans coordonnées personnelles sur le stock existant.';