-- Sauvegarde datée des offres d'entraide, avant leur reprise sur
-- profiles.helps_with (nouveau modèle : un besoin, dix personnes du coin).
CREATE TABLE IF NOT EXISTS public._backup_small_missions_offres_20260921 AS
SELECT * FROM public.small_missions WHERE mission_type = 'offre';

ALTER TABLE public._backup_small_missions_offres_20260921 ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public._backup_small_missions_offres_20260921 TO service_role;
COMMENT ON TABLE public._backup_small_missions_offres_20260921 IS
  'Sauvegarde des offres d''entraide avant reprise sur profiles.helps_with, 21/09/2026. RLS activée sans policy : lecture réservée au service.';