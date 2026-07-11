
-- Anti-abuse throttle for anonymous inserts on public analytics/contact tables.
-- Global per-minute cap (not per-IP; the pooler collapses client IPs).
-- Level: warn — mitigates data pollution risk from unauthenticated clients.

CREATE TABLE IF NOT EXISTS public.anon_insert_throttle (
  table_name text NOT NULL,
  bucket_minute timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (table_name, bucket_minute)
);

-- No grants to anon/authenticated: only the SECURITY DEFINER trigger reads/writes.
GRANT ALL ON public.anon_insert_throttle TO service_role;

ALTER TABLE public.anon_insert_throttle ENABLE ROW LEVEL SECURITY;
-- No policies: locked to service_role/definer functions.

CREATE OR REPLACE FUNCTION public.enforce_anon_insert_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := COALESCE(NULLIF(TG_ARGV[0], '')::int, 60);
  v_bucket timestamptz := date_trunc('minute', now());
  v_count integer;
BEGIN
  -- Only throttle unauthenticated inserts. Authenticated + service_role bypass.
  IF auth.uid() IS NOT NULL THEN
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
$$;

REVOKE ALL ON FUNCTION public.enforce_anon_insert_rate_limit() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_anon_ratelimit_analytics_events ON public.analytics_events;
CREATE TRIGGER trg_anon_ratelimit_analytics_events
  BEFORE INSERT ON public.analytics_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_anon_insert_rate_limit('120');

DROP TRIGGER IF EXISTS trg_anon_ratelimit_contact_messages ON public.contact_messages;
CREATE TRIGGER trg_anon_ratelimit_contact_messages
  BEFORE INSERT ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_anon_insert_rate_limit('5');

DROP TRIGGER IF EXISTS trg_anon_ratelimit_email_campaign_events ON public.email_campaign_events;
CREATE TRIGGER trg_anon_ratelimit_email_campaign_events
  BEFORE INSERT ON public.email_campaign_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_anon_insert_rate_limit('120');
