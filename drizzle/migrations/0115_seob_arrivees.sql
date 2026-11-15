-- Lot SEO-B (15/11/2026, audit claude/audit-onglet-seo-admin-trafic-15-novembre-2026.md,
-- maquette Claude Design « Guardiens admin, onglet SEO et IA : pilotage, avant / après »,
-- « oui je valide go » de Jérémie) : onglet SEO et IA de /admin/traffic.
--
-- 1. seob_page_template(path) : type de page d'une adresse du site, même règle
--    que pageTemplate (src/lib/admin/seoPilot.ts) : accueil, articles, villes,
--    departements, races, guides, associations, fiches_gardien, annonces,
--    entraide, autres (les pages d'index comme /house-sitting comptent en autres).
-- 2. admin_landing_outcomes(p_from, p_to, p_channel) : pour un canal
--    (recherche_naturelle pour Google, ia pour les assistants), par type de page
--    d'arrivée puis pour les 10 pages d'arrivée les plus fréquentes : visites
--    (première page vue de chaque visite, rangée par la règle de l'onglet Leads,
--    trf2_page_view_source et derive_signup_channel, admins exclus), inscrits
--    (profils créés sur la période, canal de profile_signup_sources, page
--    d'arrivée enregistrée à l'inscription, comptes supprimés et admins exclus)
--    et membres avec une annonce de garde publiée. Jours de Paris. Lecture
--    réservée aux admins et au rôle service.
-- Rejouable. Repère : seob_arrivees.

CREATE OR REPLACE FUNCTION public.seob_page_template(p_path text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE
    WHEN v.p IN ('', '/') THEN 'accueil'
    WHEN v.p LIKE '/actualites/_%' OR v.p LIKE '/articles/_%' THEN 'articles'
    WHEN v.p LIKE '/house-sitting/_%' THEN 'villes'
    WHEN v.p LIKE '/departement/_%' THEN 'departements'
    WHEN v.p LIKE '/races/_%' THEN 'races'
    WHEN v.p LIKE '/guides/_%' THEN 'guides'
    WHEN v.p LIKE '/associations/_%' THEN 'associations'
    WHEN v.p LIKE '/gardiens/_%' THEN 'fiches_gardien'
    WHEN v.p LIKE '/annonces/_%' OR v.p LIKE '/sits/_%' THEN 'annonces'
    WHEN v.p LIKE '/petites-missions/_%' THEN 'entraide'
    ELSE 'autres'
  END
  FROM (SELECT regexp_replace(regexp_replace(coalesce(p_path, ''), '[?#].*$', ''), '(.)/$', '\1') AS p) v
$function$;

CREATE OR REPLACE FUNCTION public.admin_landing_outcomes(p_from date, p_to date, p_channel text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_from timestamptz := (p_from::timestamp AT TIME ZONE 'Europe/Paris');
  v_to timestamptz := ((p_to + 1)::timestamp AT TIME ZONE 'Europe/Paris');
  v_templates jsonb;
  v_pages jsonb;
BEGIN
  -- Repère : seob_arrivees.
  IF coalesce(auth.role(), '') <> 'service_role'
     AND (auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  WITH first_views AS (
    SELECT DISTINCT ON (e.metadata ->> 'visit_id')
           e.metadata ->> 'visit_id' AS visit_id,
           e.source AS path,
           public.trf2_page_view_source(e.metadata) AS src
    FROM public.analytics_events e
    WHERE e.event_type = 'page_view'
      AND e.created_at >= v_from AND e.created_at < v_to
      AND e.metadata ? 'visit_id'
      AND coalesce(e.metadata ->> 'visit_id', '') <> ''
      AND (e.user_id IS NULL OR NOT public.has_role(e.user_id, 'admin'::public.app_role))
    ORDER BY e.metadata ->> 'visit_id', e.created_at
  ),
  visits AS (
    SELECT regexp_replace(regexp_replace(coalesce(path, ''), '[?#].*$', ''), '(.)/$', '\1') AS path
    FROM first_views
    WHERE public.derive_signup_channel(src) = p_channel
  ),
  cohort AS (
    SELECT pr.id,
           regexp_replace(regexp_replace(coalesce(s.landing_path, ''), '[?#].*$', ''), '(.)/$', '\1') AS path,
           EXISTS (SELECT 1 FROM public.sits st WHERE st.user_id = pr.id AND st.published_at IS NOT NULL) AS published
    FROM public.profiles pr
    JOIN public.profile_signup_sources s ON s.user_id = pr.id
    WHERE pr.created_at >= v_from AND pr.created_at < v_to
      AND s.channel = p_channel
      AND (pr.account_status IS NULL OR pr.account_status::text <> 'deleted')
      AND NOT public.has_role(pr.id, 'admin'::public.app_role)
  ),
  v_t AS (SELECT public.seob_page_template(path) AS template, count(*) AS visits FROM visits GROUP BY 1),
  s_t AS (
    SELECT public.seob_page_template(path) AS template, count(*) AS signups,
           count(*) FILTER (WHERE published) AS published_members
    FROM cohort GROUP BY 1
  ),
  t AS (
    SELECT coalesce(v.template, s.template) AS template,
           coalesce(v.visits, 0) AS visits,
           coalesce(s.signups, 0) AS signups,
           coalesce(s.published_members, 0) AS published_members
    FROM v_t v FULL JOIN s_t s ON s.template = v.template
  ),
  v_p AS (SELECT path, count(*) AS visits FROM visits GROUP BY 1),
  s_p AS (
    SELECT path, count(*) AS signups, count(*) FILTER (WHERE published) AS published_members
    FROM cohort GROUP BY 1
  ),
  p AS (
    SELECT coalesce(v.path, s.path) AS path,
           coalesce(v.visits, 0) AS visits,
           coalesce(s.signups, 0) AS signups,
           coalesce(s.published_members, 0) AS published_members
    FROM v_p v FULL JOIN s_p s ON s.path = v.path
  )
  SELECT
    (SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.signups DESC, t.visits DESC, t.template), '[]'::jsonb) FROM t),
    (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.signups DESC, x.visits DESC, x.path), '[]'::jsonb)
       FROM (SELECT * FROM p ORDER BY signups DESC, visits DESC, path LIMIT 10) x)
  INTO v_templates, v_pages;

  RETURN jsonb_build_object('templates', v_templates, 'pages', v_pages);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_landing_outcomes(date, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_landing_outcomes(date, date, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.seob_page_template(text) TO authenticated, service_role;
