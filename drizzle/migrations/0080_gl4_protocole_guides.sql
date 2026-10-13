-- Lot GL4 (14/10/2026) : protocole de génération des guides locaux.
--
-- Mesures du 13/10/2026 : Overpass refuse les appels des fonctions serveur
-- (406 ou aucune réponse en 15 s) et pg_net n'expédie les requêtes déposées
-- par une fonction qu'une fois terminé l'appel qui l'a lancée. La file avance
-- donc par passages : requêtes envoyées par la base, réponses relues au
-- passage suivant, rayon élargi, puis guide terminé (pipeline.ts).
--
-- 1. guide_osm_requests : requêtes OpenStreetMap d'un guide en cours (clé
--    service seule, réponses réduites aux lieux utiles).
-- 2. city_guides : verrou de passage et nombre de passages.
-- 3. File SEO : la bascule « sourcé », le pays et le centre d'un guide
--    remettent sa page dans la file de prérendu (maillage par distance).

-- 1
CREATE TABLE IF NOT EXISTS public.guide_osm_requests (
  id bigserial PRIMARY KEY,
  city_guide_id uuid NOT NULL REFERENCES public.city_guides(id) ON DELETE CASCADE,
  round integer NOT NULL,
  radius integer NOT NULL,
  statement text NOT NULL,
  mirror integer NOT NULL DEFAULT 0,
  net_id bigint,
  tries integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'done', 'failed')),
  elements jsonb,
  outcome text,
  dry_run boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS guide_osm_requests_guide_idx ON public.guide_osm_requests (city_guide_id);
ALTER TABLE public.guide_osm_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guide_osm_requests FROM anon, authenticated;
GRANT ALL ON public.guide_osm_requests TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.guide_osm_requests_id_seq TO service_role;

-- 2
ALTER TABLE public.city_guides ADD COLUMN IF NOT EXISTS pipeline_lock_until timestamptz;
ALTER TABLE public.city_guides ADD COLUMN IF NOT EXISTS places_source_passes integer NOT NULL DEFAULT 0;

-- 3
DROP TRIGGER IF EXISTS seo_url_outbox_guides ON public.city_guides;
CREATE TRIGGER seo_url_outbox_guides AFTER INSERT OR UPDATE OR DELETE ON public.city_guides
  FOR EACH ROW EXECUTE FUNCTION public.queue_public_seo_change('/guides/', '/guides',
    'slug,city,postal_code,intro,ideal_for,department,published,leash_rule,leash_rule_source,places_sourced_at,country,latitude,longitude');