CREATE TYPE public.mission_type_enum AS ENUM ('besoin', 'offre');

ALTER TABLE public.small_missions
  ADD COLUMN mission_type public.mission_type_enum NOT NULL DEFAULT 'besoin';

-- Backfill heuristique: titres ou descriptions évoquant une offre
UPDATE public.small_missions
SET mission_type = 'offre'
WHERE 
  title ~* '\m(propose|propos(e|ons)|offre|disponible|peux m''occuper|peut m''occuper|peux garder|peut garder|nous pouvons|je peux|j''offre|à offrir)\M'
  OR description ~* '\m(je propose|nous proposons|j''offre|nous offrons|je peux m''occuper|nous pouvons m''occuper|je suis disponible|nous sommes disponibles|je peux garder|nous pouvons garder)\M';

CREATE INDEX IF NOT EXISTS idx_small_missions_mission_type ON public.small_missions(mission_type);