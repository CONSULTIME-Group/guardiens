ALTER TABLE public.small_missions
  ADD COLUMN IF NOT EXISTS savoir_faire_attendus text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS savoir_faire_transmis text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS offre text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS mois_accueil text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.small_missions.savoir_faire_attendus IS 'Projets participatifs : cles de savoir-faire attendus. Tableau vide = rien, tout s apprend sur place.';
COMMENT ON COLUMN public.small_missions.savoir_faire_transmis IS 'Projets participatifs : cles de savoir-faire transmis pendant le chantier.';
COMMENT ON COLUMN public.small_missions.offre IS 'Projets participatifs : cles de ce qui est offert sur place (outils, protection, atelier, gare).';
COMMENT ON COLUMN public.small_missions.mois_accueil IS 'Projets participatifs : mois d accueil coches, valeurs YYYY-MM.';

CREATE OR REPLACE VIEW public.public_small_missions AS
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
    mois_accueil
   FROM small_missions
  WHERE status = 'open'::small_mission_status AND moderation_hidden_at IS NULL AND hidden_at IS NULL;