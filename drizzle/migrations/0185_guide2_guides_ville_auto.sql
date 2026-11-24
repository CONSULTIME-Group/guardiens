-- Lot GUIDE2 (24/11/2026, audit claude/audit-generateurs-guides-22-novembre-2026.md,
-- defaut V2, « ok go je valide tout » puis « ok enchaine go » de Jeremie).
-- Repere : guide2_guides_ville_auto.
--
-- Une annonce publiee dans une ville sans guide cree une demande
-- (guide_requests, declencheur upsert_guide_request_from_sit), qui attendait un
-- clic admin (Noyal-sur-Vilaine en attente du 23/06 au 23/11/2026). La tache
-- auto-create-city-guides appelle generate-city-guide sur les demandes en
-- attente, en France seulement (site 100 % francais), au plus 5 par jour de
-- Paris. Le guide est cree sans lieu ; la file source-guide-places le source
-- et le publie, et link_guide_request_on_city_guide_publish passe la demande
-- a « created ». Une demande hors de France reste a la main de l'admin.
-- Trois essais au plus par demande, espaces de 7 jours.
-- Rejouable.

ALTER TABLE public.guide_requests
  ADD COLUMN IF NOT EXISTS auto_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_attempted_at timestamptz;

COMMENT ON COLUMN public.guide_requests.auto_attempts IS 'guide2_guides_ville_auto : nombre d''appels automatiques de generate-city-guide (3 au plus).';

CREATE OR REPLACE FUNCTION public.auto_create_city_guides(p_daily_cap integer DEFAULT 5)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _url text := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/generate-city-guide';
  _key text;
  _today_start timestamptz := date_trunc('day', now() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris';
  _done_today integer;
  _room integer;
  _called text[] := ARRAY[]::text[];
  _skipped_abroad integer;
  _started timestamptz := clock_timestamp();
  r record;
BEGIN
  SELECT count(*) INTO _done_today
  FROM public.guide_requests
  WHERE auto_attempted_at >= _today_start;
  _room := greatest(coalesce(p_daily_cap, 5) - _done_today, 0);

  SELECT count(*) INTO _skipped_abroad
  FROM public.guide_requests
  WHERE status = 'pending' AND upper(coalesce(nullif(trim(country), ''), 'FR')) <> 'FR';

  SELECT decrypted_secret INTO _key
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_service_role_key'
  LIMIT 1;

  IF _key IS NULL OR length(_key) = 0 THEN
    INSERT INTO public.cron_run_log (edge_name, started_at, finished_at, status, metrics, error_message)
    VALUES ('auto-create-city-guides', _started, clock_timestamp(), 'failed',
            jsonb_build_object('called', 0), 'cle de service absente du coffre');
    RETURN jsonb_build_object('called', 0, 'error', 'no_key');
  END IF;

  IF _room > 0 THEN
    FOR r IN
      SELECT gr.id, gr.city, gr.slug, gr.postal_code, gr.department, gr.latitude, gr.longitude
      FROM public.guide_requests gr
      WHERE gr.status = 'pending'
        AND upper(coalesce(nullif(trim(gr.country), ''), 'FR')) = 'FR'
        AND gr.active_sits_count >= 1
        AND gr.auto_attempts < 3
        AND (gr.auto_attempted_at IS NULL OR gr.auto_attempted_at < now() - interval '7 days')
        AND NOT EXISTS (SELECT 1 FROM public.city_guides g WHERE g.slug = gr.slug)
      ORDER BY gr.active_sits_count DESC, gr.first_requested_at
      LIMIT _room
    LOOP
      UPDATE public.guide_requests
      SET auto_attempts = auto_attempts + 1, auto_attempted_at = now()
      WHERE id = r.id;

      PERFORM net.http_post(
        url := _url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || _key
        ),
        body := jsonb_strip_nulls(jsonb_build_object(
          'city', r.city,
          'postal_code', r.postal_code,
          'department', r.department,
          'country', 'FR',
          'latitude', r.latitude,
          'longitude', r.longitude
        ))
      );
      _called := _called || r.slug;
    END LOOP;
  END IF;

  INSERT INTO public.cron_run_log (edge_name, started_at, finished_at, status, metrics)
  VALUES ('auto-create-city-guides', _started, clock_timestamp(), 'success',
          jsonb_build_object('called', coalesce(array_length(_called, 1), 0),
                             'slugs', to_jsonb(_called),
                             'done_today', _done_today,
                             'pending_abroad', _skipped_abroad));

  RETURN jsonb_build_object('called', coalesce(array_length(_called, 1), 0), 'slugs', to_jsonb(_called));
END;
$function$;

REVOKE ALL ON FUNCTION public.auto_create_city_guides(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_create_city_guides(integer) TO service_role;

-- Toutes les heures a la minute 17 (regle REL1b et JOURN2 : jamais une minute
-- multiple de 5). Le plafond se compte par jour de Paris.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-create-city-guides') THEN
    PERFORM cron.unschedule('auto-create-city-guides');
  END IF;
  PERFORM cron.schedule('auto-create-city-guides', '17 * * * *', 'SELECT public.auto_create_city_guides(5);');
END $$;
