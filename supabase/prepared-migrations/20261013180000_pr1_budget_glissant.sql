-- Lot PR1 (13/10/2026) : plafond de renders du consommateur sur 30 jours glissants.
--
-- Constat : au 13/10, 17 768 renders inities par Guardiens depuis le 1er octobre
-- (prerender_recache_log), quota Prerender de 25 000 epuise (compte partage avec
-- un autre domaine, plus les renders des robots). Le plafond de 18 000 par mois
-- calendaire ne protegeait pas le cycle Prerender, qui ne commence pas le 1er.
--
-- Regle : une tentative est reservee si le journal compte moins de 9 900 lignes
-- sur les 30 derniers jours. La marge de 100 couvre les tentatives d'un passage
-- pas encore journalisees (au plus 81 par passage). Meme plafond de 10 000 que
-- MONTHLY_RENDER_BUDGET dans detect-deploy-and-mark-dirty.
-- seo_render_budget reste tenu comme compteur mensuel, sans plafond propre.

CREATE OR REPLACE FUNCTION public.seo_reserve_render(p_holder uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  m date := date_trunc('month',clock_timestamp() AT TIME ZONE 'UTC')::date;
  used integer;
BEGIN
  UPDATE public.seo_consumer_lease SET expires_at=clock_timestamp()+interval '5 minutes'
   WHERE singleton AND holder=p_holder AND expires_at>clock_timestamp();
  IF NOT FOUND THEN RAISE EXCEPTION 'SEO consumer lease expired'; END IF;
  SELECT count(*)::integer INTO used FROM public.prerender_recache_log
   WHERE created_at > clock_timestamp() - interval '30 days';
  IF used >= 9900 THEN RETURN false; END IF;
  INSERT INTO public.seo_render_budget(month,attempts)
  SELECT m,count(*)::integer FROM public.prerender_recache_log
   WHERE created_at>=m::timestamp AT TIME ZONE 'UTC'
  ON CONFLICT(month) DO NOTHING;
  UPDATE public.seo_render_budget SET attempts=attempts+1 WHERE month=m;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.seo_reserve_render(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seo_reserve_render(uuid) TO service_role;

COMMENT ON TABLE public.seo_render_budget IS 'Compteur mensuel des tentatives du consommateur Guardiens. Le plafond est porte par seo_reserve_render : 9 900 lignes de prerender_recache_log sur 30 jours glissants (lot PR1, 13/10/2026).';

