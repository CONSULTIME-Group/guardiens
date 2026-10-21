-- Lot PR2 (21/10/2026) : allocation ponctuelle de rendus Prerender au-delà
-- du plafond de 9 900 rendus sur 30 jours glissants.
--
-- APPLIQUÉ EN PRODUCTION le 21/10/2026 à 12 h 48 (GO explicite de Jérémie),
-- contrôle : allocation 1 000, expiration 2026-11-03 23:00 UTC, fonction à jour.
--
-- Constat (production, 21/10/2026) :
-- - 18 674 rendus réussis sur 30 jours glissants : le plafond bloque tout envoi
--   depuis le 13/10, il ne retomberait sous 9 900 que vers le 7 novembre.
-- - File en attente : environ 800 pages modifiées (articles, guides, pages
--   villes et départements, annonces, fiches gardien indexables, missions).
-- - Compte Prerender (tableau de bord, 21/10) : formule Starter, 30 000 rendus
--   inclus, dépassement facturé 2,25 $ les 1 000 rendus, prochain cycle le
--   4 novembre 2026. Le plafond interne n'est donc pas un mur côté Prerender :
--   au-delà, le coût est d'environ 2 $ pour la file entière.
--
-- Décision de Jérémie (21/10/2026) : envoyer toutes les pages modifiées.
--
-- Mécanique : quand le plafond est atteint, seo_reserve_render consomme une
-- unité de l'allocation tant qu'elle est positive et non expirée. Sans
-- allocation, comportement inchangé. Le détecteur de mise en ligne garde son
-- propre plafond : aucune vague de déploiement n'est relancée par ce lot.
BEGIN;

CREATE TABLE IF NOT EXISTS public.seo_render_allowance (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  remaining integer NOT NULL CHECK (remaining >= 0),
  expires_at timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_render_allowance ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.seo_render_allowance FROM PUBLIC, anon, authenticated;

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

REVOKE ALL ON FUNCTION public.seo_reserve_render(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seo_reserve_render(uuid) TO service_role;

-- Allocation du 21/10/2026 : 1 000 rendus, jusqu'au renouvellement du cycle
-- Prerender (4 novembre 2026, 00 h heure de Paris).
INSERT INTO public.seo_render_allowance (singleton, remaining, expires_at, reason)
VALUES (true, 1000, '2026-11-04 00:00:00+01', 'Pages modifiées en attente, décision Jérémie 21/10/2026')
ON CONFLICT (singleton) DO UPDATE
  SET remaining = EXCLUDED.remaining, expires_at = EXCLUDED.expires_at,
      reason = EXCLUDED.reason, created_at = now();

COMMIT;

-- Contrôle (lecture seule) :
-- SELECT remaining, expires_at FROM public.seo_render_allowance;
-- SELECT created_at::date, source, count(*) FILTER (WHERE ok) FROM public.prerender_recache_log
--  WHERE created_at > now() - interval '1 day' GROUP BY 1,2 ORDER BY 1,2;
