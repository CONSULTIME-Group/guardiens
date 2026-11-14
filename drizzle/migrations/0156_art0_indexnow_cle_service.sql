-- Lot ART0 (14/11/2026) : les signaux IndexNow automatiques repartent.
-- Repère : art0_indexnow_cle_service.
--
-- Pourquoi : depuis le lot SEC2 (11/11/2026, 10 h 48), notify-indexnow exige
-- un admin ou le rôle service. trigger_indexnow_push, appelée par les
-- déclencheurs d'articles, d'annonces, de besoins, de pages ville, de guides et
-- de départements, l'appelait avec la clé publique : chaque appel répond 401.
-- Base du 14/11/2026 : dernière ligne de indexnow_submissions le 11/11 à
-- 09 h 30 UTC (187 à 370 envois par jour avant), 103 réponses 401 dans
-- net._http_response depuis 02 h 37 UTC le 14/11.
--
-- Correctif : même source de clé que les tâches pg_cron du site
-- (vault.decrypted_secrets, nom supabase_service_role_key). Sans clé lisible,
-- aucun appel ne part. Droits inchangés : postgres et service_role seuls
-- exécutent la fonction (relevé du 14/11), tous ses appelants sont des
-- fonctions SECURITY DEFINER de postgres. Signature, retour et corps d'appel
-- inchangés. Rejouable.
CREATE OR REPLACE FUNCTION public.trigger_indexnow_push(_path text, _source text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _url text := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/notify-indexnow';
  _key text;
BEGIN
  IF _path IS NULL OR length(_path) = 0 THEN RETURN; END IF;
  SELECT decrypted_secret INTO _key
    FROM vault.decrypted_secrets
   WHERE name = 'supabase_service_role_key'
   LIMIT 1;
  IF _key IS NULL OR length(_key) = 0 THEN RETURN; END IF;
  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body := jsonb_build_object(
      'urls', jsonb_build_array(_path),
      'source', _source
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.trigger_indexnow_push(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_indexnow_push(text, text) TO service_role;
