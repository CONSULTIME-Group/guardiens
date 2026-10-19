-- Lot SEO1 (19/10/2026) : les refus « monthly_budget_exceeded » sortent du
-- compte des 30 jours du consommateur de pré-rendu.
--
-- PRÉPARÉ, NON APPLIQUÉ. Lovable crée le fichier drizzle à l'application.
--
-- Constat (base de production, lecture seule, 19/10/2026) : sur 30 jours,
-- prerender_recache_log compte 19 659 lignes, dont 579 refus du détecteur
-- (source deploy-detector, ok = false, detail « monthly_budget_exceeded, ... »)
-- écrits depuis le 13/10 (jusqu'à 144 par jour) et 1 échec du consommateur.
-- Ces lignes ne consomment aucun rendu Prerender mais entraient dans le compte
-- `used` de seo_reserve_render, ce qui repoussait la reprise d'environ un jour.
--
-- Seule différence avec la définition en production (pg_get_functiondef du
-- 19/10/2026) : `AND ok` dans le calcul de `used`. Le compteur informatif
-- seo_render_budget.attempts garde sa définition. Même filtre côté détecteur :
-- supabase/functions/detect-deploy-and-mark-dirty/index.ts (deux lectures).
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
BEGIN
  UPDATE public.seo_consumer_lease SET expires_at=clock_timestamp()+interval '5 minutes'
   WHERE singleton AND holder=p_holder AND expires_at>clock_timestamp();
  IF NOT FOUND THEN RAISE EXCEPTION 'SEO consumer lease expired'; END IF;
  -- Lot SEO1 : seuls les rendus réussis comptent, les refus (ok = false) sortent du compte.
  SELECT count(*)::integer INTO used FROM public.prerender_recache_log
   WHERE created_at > clock_timestamp() - interval '30 days' AND ok;
  IF used >= 9900 THEN RETURN false; END IF;
  INSERT INTO public.seo_render_budget(month,attempts)
  SELECT m,count(*)::integer FROM public.prerender_recache_log
   WHERE created_at>=m::timestamp AT TIME ZONE 'UTC'
  ON CONFLICT(month) DO NOTHING;
  UPDATE public.seo_render_budget SET attempts=attempts+1 WHERE month=m;
  RETURN true;
END $function$;

-- Droits inchangés : la fonction reste réservée au rôle de service.
REVOKE ALL ON FUNCTION public.seo_reserve_render(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seo_reserve_render(uuid) TO service_role;

COMMIT;

-- Contrôle après application (lecture seule) :
-- SELECT pg_get_functiondef('public.seo_reserve_render(uuid)'::regprocedure) ~ 'interval ''30 days'' AND ok';
-- SELECT count(*) FILTER (WHERE ok) AS rendus_comptes, count(*) FILTER (WHERE NOT ok) AS refus_hors_compte
--   FROM public.prerender_recache_log WHERE created_at > now() - interval '30 days';
