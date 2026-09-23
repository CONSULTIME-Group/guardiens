CREATE TYPE public.mission_sit_mode AS ENUM ('at_home', 'visits', 'at_helper');

ALTER TABLE public.small_missions
  ADD COLUMN sit_mode public.mission_sit_mode;

COMMENT ON COLUMN public.small_missions.sit_mode IS
  'Deroulement declare pour un besoin animal detecte comme garde potentielle.';

CREATE OR REPLACE VIEW public.public_small_missions AS
SELECT
  id, user_id, slug, title, description, category, exchange_offer,
  city, postal_code, round(latitude, 2) AS latitude,
  round(longitude, 2) AS longitude, date_needed, end_date,
  duration_estimate, status, mission_type, photos, pet_species, pet_size,
  created_at, max_participants, accepting_applications, hebergement, repas,
  ce_que_vous_apprendrez, nature_projet, savoir_faire_attendus,
  savoir_faire_transmis, offre, mois_accueil, sit_mode
FROM public.small_missions
WHERE status = 'open'::public.small_mission_status
  AND moderation_hidden_at IS NULL
  AND hidden_at IS NULL;

GRANT SELECT ON public.public_small_missions TO anon, authenticated;
GRANT ALL ON public.public_small_missions TO service_role;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.public_small_missions FROM anon, authenticated, PUBLIC;