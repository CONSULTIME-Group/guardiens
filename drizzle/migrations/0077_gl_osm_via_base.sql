-- Lot GL (13/10/2026) : Overpass interrogé depuis la base.
--
-- Mesure du 13/10/2026 : les requêtes Overpass courtes répondent depuis la
-- base (pg_net) et échouent sur les quatre miroirs depuis la fonction
-- source-guide-places, dont l'adresse de sortie est partagée. La fonction
-- serveur garde la main : elle envoie chaque requête par guide_osm_enqueue
-- (pg_net l'expédie une fois l'appel validé) puis lit la réponse par
-- guide_osm_result.
--
-- Garde-fous : miroirs en liste fermée, requête Overpass JSON de 4 000
-- caractères au plus, exécution réservée à la clé service.

CREATE OR REPLACE FUNCTION public.guide_osm_enqueue(p_query text, p_mirror integer DEFAULT 0)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_urls text[] := ARRAY[
    'https://overpass-api.de/api/interpreter',
    'https://overpass.openstreetmap.fr/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];
BEGIN
  IF p_query IS NULL OR length(p_query) > 4000 OR left(p_query, 11) <> '[out:json][' THEN
    RAISE EXCEPTION 'guide_osm_enqueue: requête refusée';
  END IF;
  RETURN net.http_get(
    url := v_urls[1 + (abs(coalesce(p_mirror, 0)) % array_length(v_urls, 1))],
    params := jsonb_build_object('data', p_query),
    headers := '{"User-Agent":"Guardiens/1.0 (guides locaux; contact@guardiens.fr)"}'::jsonb,
    timeout_milliseconds := 28000
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.guide_osm_result(p_id bigint)
RETURNS TABLE(status_code integer, timed_out boolean, error_msg text, content text)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT r.status_code, r.timed_out, r.error_msg, r.content::text
  FROM net._http_response r
  WHERE r.id = p_id
$$;

REVOKE ALL ON FUNCTION public.guide_osm_enqueue(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guide_osm_result(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guide_osm_enqueue(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.guide_osm_result(bigint) TO service_role;