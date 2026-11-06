-- Lot PR3 (06/11/2026) : le plafond de rendus Prerender se lit depuis le début
-- du cycle de facturation Prerender (le 4 de chaque mois, 00 h heure de Paris),
-- et non plus sur 30 jours glissants.
--
-- Constat (production, 06/11/2026) : Prerender est reparti à zéro le 4 novembre
-- (Jérémie : « les renders sont revenus à 0 »), mais la fenêtre glissante gardait
-- les 14 458 rendus d'octobre : toutes les vagues (308 pages : villes, départements,
-- guides, articles, pages statiques) étaient refusées « monthly_budget_exceeded »,
-- la dernière vague datant du 12/10.
--
-- Valeurs inchangées : plafond 9 900 (le détecteur applique 10 000, il passe en
-- premier), allocation ponctuelle PR2 inchangée. Seule la date de départ du
-- compte change.
BEGIN;

CREATE OR REPLACE FUNCTION public.seo_reserve_render(p_holder uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  m date := date_trunc('month',clock_timestamp() AT TIME ZONE 'UTC')::date;
  used integer;
  paris timestamp := clock_timestamp() AT TIME ZONE 'Europe/Paris';
  cycle_local timestamp;
  cycle_start timestamptz;
BEGIN
  UPDATE public.seo_consumer_lease SET expires_at=clock_timestamp()+interval '5 minutes'
   WHERE singleton AND holder=p_holder AND expires_at>clock_timestamp();
  IF NOT FOUND THEN RAISE EXCEPTION 'SEO consumer lease expired'; END IF;
  -- Lot PR3 : début du cycle Prerender = le 4 du mois, 00 h Paris (le mois
  -- précédent tant que le 4 n'est pas passé).
  cycle_local := date_trunc('month', paris) + interval '3 days';
  IF paris < cycle_local THEN cycle_local := cycle_local - interval '1 month'; END IF;
  cycle_start := cycle_local AT TIME ZONE 'Europe/Paris';
  -- Lot SEO1 : seuls les rendus réussis comptent, les refus (ok = false) sortent du compte.
  SELECT count(*)::integer INTO used FROM public.prerender_recache_log
   WHERE created_at >= cycle_start AND ok;
  IF used >= 9900 THEN
    -- Lot PR2 : allocation ponctuelle décidée hors plafond.
    UPDATE public.seo_render_allowance SET remaining = remaining - 1
     WHERE singleton AND remaining > 0 AND expires_at > clock_timestamp();
    IF NOT FOUND THEN RETURN false; END IF;
  END IF;
  INSERT INTO public.seo_render_budget(month,attempts)
  SELECT m,count(*)::integer FROM public.prerender_recache_log
   WHERE created_at>=m::timestamp AT TIME ZONE 'UTC'
  ON CONFLICT(month) DO NOTHING;
  UPDATE public.seo_render_budget SET attempts=attempts+1 WHERE month=m;
  RETURN true;
END $function$;

COMMIT;
