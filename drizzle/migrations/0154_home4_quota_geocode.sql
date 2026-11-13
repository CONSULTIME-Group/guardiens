-- Lot HOME4 (13 novembre 2026) : quota de la fonction geocode.
-- Constat F23 de l'audit de la home : la fonction est ouverte, sans limite,
-- et chaque nom inconnu part vers Nominatim (jusqu'à quatre requêtes), qui
-- bannit les appelants trop pressants. Le quota compte les seules recherches
-- qui sortent vers Nominatim : le cache et le référentiel officiel des
-- communes restent libres. Aucune adresse IP n'est écrite : le seau est une
-- empreinte. Repère : home4_quota_geocode.
CREATE TABLE IF NOT EXISTS public.geocode_quota (
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

COMMENT ON TABLE public.geocode_quota IS
  'Lot HOME4 : compteur horaire des recherches geocode envoyées à Nominatim, par empreinte d''appelant et au total. Écrit par geocode_quota_take.';

ALTER TABLE public.geocode_quota ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.geocode_quota FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.geocode_quota TO service_role;

CREATE OR REPLACE FUNCTION public.geocode_quota_take(p_bucket text, p_limit integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_window timestamptz := date_trunc('hour', now());
  v_hits integer;
BEGIN
  -- home4_quota_geocode : une prise par recherche sortante, fenêtre d'une heure.
  IF p_bucket IS NULL OR length(p_bucket) < 3 OR length(p_bucket) > 80 OR p_limit IS NULL OR p_limit < 1 THEN
    RETURN true;
  END IF;
  INSERT INTO public.geocode_quota AS q (bucket, window_start, hits)
  VALUES (p_bucket, v_window, 1)
  ON CONFLICT (bucket, window_start) DO UPDATE SET hits = q.hits + 1
  RETURNING q.hits INTO v_hits;
  -- Ménage des fenêtres de plus de deux jours, au fil des appels.
  IF v_hits = 1 THEN
    DELETE FROM public.geocode_quota WHERE window_start < now() - interval '2 days';
  END IF;
  RETURN v_hits <= p_limit;
END;
$function$;

COMMENT ON FUNCTION public.geocode_quota_take(text, integer) IS
  'Lot HOME4 : prend une unité du quota horaire d''un seau. Rend faux quand la limite est dépassée. Réservée au rôle de service.';
REVOKE ALL ON FUNCTION public.geocode_quota_take(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.geocode_quota_take(text, integer) TO service_role;
