-- Lot GL5 (14/10/2026) : centre d'un guide hors BAN cherché par la base.
--
-- Mesure du 14/10/2026 : Nominatim ne répond pas aux fonctions serveur
-- (Nouméa, Papeete, Punaauia restés sans centre, Taravao centré à 60 km dans
-- l'océan sur le lieu du propriétaire), alors que la même recherche envoyée
-- par la base répond. Comme pour Overpass (lot GL), la fonction dépose la
-- recherche par guide_geocode_enqueue et relit la réponse au passage suivant
-- par guide_osm_result.
--
-- Garde-fous : adresse fixe (recherche Nominatim), paramètres en liste fermée,
-- texte de 200 caractères au plus, exécution réservée à la clé service.

CREATE OR REPLACE FUNCTION public.guide_geocode_enqueue(p_params jsonb)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_allowed text[] := ARRAY['format', 'addressdetails', 'limit', 'city', 'q', 'countrycodes', 'accept-language'];
  v_params jsonb := '{}'::jsonb;
  v_key text;
  v_value text;
BEGIN
  IF p_params IS NULL OR jsonb_typeof(p_params) <> 'object' THEN
    RAISE EXCEPTION 'guide_geocode_enqueue: paramètres refusés';
  END IF;
  FOR v_key, v_value IN SELECT key, value FROM jsonb_each_text(p_params) LOOP
    IF NOT (v_key = ANY (v_allowed)) OR v_value IS NULL OR length(v_value) > 200 THEN
      RAISE EXCEPTION 'guide_geocode_enqueue: paramètres refusés';
    END IF;
    v_params := v_params || jsonb_build_object(v_key, v_value);
  END LOOP;
  IF NOT (v_params ? 'city' OR v_params ? 'q') THEN
    RAISE EXCEPTION 'guide_geocode_enqueue: paramètres refusés';
  END IF;
  RETURN net.http_get(
    url := 'https://nominatim.openstreetmap.org/search',
    params := v_params,
    headers := '{"User-Agent":"Guardiens/1.0 (guides locaux; contact@guardiens.fr)"}'::jsonb,
    timeout_milliseconds := 15000
  );
END;
$$;

REVOKE ALL ON FUNCTION public.guide_geocode_enqueue(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guide_geocode_enqueue(jsonb) TO service_role;
