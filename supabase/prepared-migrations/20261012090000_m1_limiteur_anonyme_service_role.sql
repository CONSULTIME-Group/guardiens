-- Lot M1 (12/10/2026) : le limiteur des insertions anonymes laisse passer
-- le service_role, comme son commentaire l'annonçait depuis le 11/07/2026.
-- Avec la clé service_role, auth.uid() vaut NULL : les traces serveur
-- (push_send_*, envois) puisaient dans le quota global des visiteurs
-- anonymes (120 par minute sur analytics_events) et pouvaient être refusées.
CREATE OR REPLACE FUNCTION public.enforce_anon_insert_rate_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_limit integer := COALESCE(NULLIF(TG_ARGV[0], '')::int, 60);
  v_bucket timestamptz := date_trunc('minute', now());
  v_count integer;
BEGIN
  -- Only throttle unauthenticated inserts. Authenticated + service_role bypass.
  IF auth.uid() IS NOT NULL OR COALESCE(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.anon_insert_throttle AS t (table_name, bucket_minute, count)
  VALUES (TG_TABLE_NAME, v_bucket, 1)
  ON CONFLICT (table_name, bucket_minute)
  DO UPDATE SET count = t.count + 1
  RETURNING count INTO v_count;

  IF v_count > v_limit THEN
    RAISE EXCEPTION 'Rate limit exceeded for anonymous inserts on %', TG_TABLE_NAME
      USING ERRCODE = '54000';
  END IF;

  -- Best-effort cleanup of buckets older than 1 hour (cheap sample).
  IF (v_count % 100) = 0 THEN
    DELETE FROM public.anon_insert_throttle
    WHERE bucket_minute < now() - interval '1 hour';
  END IF;

  RETURN NEW;
END;
$function$;
