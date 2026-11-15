-- Lot TRF2 (15/11/2026, arène claude/arene/2026-11-15-trafic, lots L1 et L3,
-- « ok je valide go » de Jérémie) : onglet Leads de /admin/traffic.
--
-- 1. derive_signup_channel reconnaît l'application hôte (clé « ap » : instagram,
--    tiktok ou facebook, lue dans l'agent du navigateur intégré par
--    src/lib/inAppBrowser.ts). Un fbclid sans utm ouvert depuis Instagram
--    devient instagram, un passage par TikTok sans site précédent devient
--    tiktok. Les règles existantes passent avant (utm, site précédent).
--    Corps repris de pg_get_functiondef en production le 15/11/2026.
--    Lignes déjà écrites : inchangées (le canal est figé à l'inscription).
-- 2. admin_channel_leads(p_from, p_to) : par canal puis par campagne, visites
--    (première page vue de chaque visite, metadata.visit_id, rangée par la même
--    règle), inscrits (profils créés, comptes supprimés exclus, canal de
--    profile_signup_sources, « inconnu » sinon), membres avec annonce publiée,
--    avec candidature, avec coup de main déposé ou répondu, avec sortie
--    (organisée ou inscription) ; et le nombre d'annonces de garde publiées
--    sur la période. Lecture réservée aux admins et au rôle service (poste
--    acquisition). Jours de Paris.
-- 3. Index partiel des pages vues porteuses d'une visite : la lecture de 30
--    jours passe de 2,5 s (24 500 lignes lues pour 1 700 retenues, mesure du
--    15/11/2026) à une lecture d'index. En production, le créer AVANT la
--    migration en CONCURRENTLY (même nom), comme le veut docs/database-deployment.md.
-- Rejouable. Repère : trf2_leads.

CREATE INDEX IF NOT EXISTS analytics_events_page_view_visit_idx
  ON public.analytics_events (created_at)
  WHERE event_type = 'page_view' AND (metadata ? 'visit_id');

CREATE OR REPLACE FUNCTION public.derive_signup_channel(p jsonb)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_ck text := coalesce(p ->> 'ck', '');
  v_us text := coalesce(public.signup_source_clean(p ->> 'us', 80), '');
  v_um text := coalesce(public.signup_source_clean(p ->> 'um', 80), '');
  v_rd text := lower(coalesce(p ->> 'rd', ''));
  v_rf boolean := coalesce(p ->> 'rf', '') = '1';
  v_ap text := lower(coalesce(p ->> 'ap', ''));
  v_host text;
BEGIN
  IF v_rd !~ '^[a-z0-9.-]{1,120}$' THEN
    v_rd := '';
  END IF;
  IF v_ap NOT IN ('instagram', 'tiktok', 'facebook') THEN
    v_ap := '';
  END IF;
  v_host := v_rd || '.';

  IF v_ck IN ('gclid', 'gbraid', 'wbraid') THEN
    RETURN 'google_ads';
  END IF;
  IF v_ck = 'fbclid' AND v_um IN ('cpc', 'ppc', 'paid', 'paid_social', 'paidsocial', 'paid-social', 'ads', 'cpm') THEN
    RETURN 'facebook_ads';
  END IF;
  IF v_us = 'email' THEN
    RETURN 'email';
  END IF;
  IF v_rf THEN
    RETURN 'parrainage';
  END IF;
  IF v_us = 'tiktok' OR (v_rd <> '' AND v_host ~ '(^|\.)tiktok\.') THEN
    RETURN 'tiktok';
  END IF;
  IF v_us IN ('youtube', 'yt') OR (v_rd <> '' AND v_host ~ '(^|\.)(youtube|youtu)\.') THEN
    RETURN 'youtube';
  END IF;
  IF v_us IN ('instagram', 'ig') OR (v_rd <> '' AND v_host ~ '(^|\.)instagram\.') THEN
    RETURN 'instagram';
  END IF;
  -- Lot TRF2 : l'application hôte départage un clic sans utm.
  IF v_ap = 'instagram' AND v_us = '' THEN
    RETURN 'instagram';
  END IF;
  IF v_ap = 'tiktok' AND v_us = '' THEN
    RETURN 'tiktok';
  END IF;
  IF v_ck = 'fbclid'
     OR (v_rd <> '' AND v_host ~ '(^|\.)(facebook|fb)\.')
     OR v_us IN ('facebook', 'fb')
     OR (v_ap = 'facebook' AND v_us = '') THEN
    RETURN 'facebook';
  END IF;
  IF v_ck NOT IN ('gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid')
     AND v_rd <> '' AND v_host ~ '(^|\.)(google|bing|qwant|duckduckgo|ecosia)\.' THEN
    RETURN 'recherche_naturelle';
  END IF;
  IF (v_rd <> '' AND v_host ~ '(^|\.)(chatgpt|openai|perplexity|gemini|claude|copilot)\.')
     OR v_us ~ '^(chatgpt|openai|perplexity|gemini|claude|copilot)' THEN
    RETURN 'ia';
  END IF;
  IF v_rd <> '' OR v_us <> '' THEN
    RETURN 'autre_site';
  END IF;
  RETURN 'direct';
END;
$function$;

-- Paramètre d'une chaîne de recherche (?a=b&c=d), nettoyé comme la source.
CREATE OR REPLACE FUNCTION public.trf2_search_param(p_search text, p_key text, p_max integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT public.signup_source_clean(
    substring(coalesce(p_search, '') from '(?:^|[?&])' || p_key || '=([^&#]*)'),
    p_max
  )
$function$;

-- Source d'une page vue, au format de la source d'inscription.
CREATE OR REPLACE FUNCTION public.trf2_page_view_source(p_meta jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'us', public.trf2_search_param(p_meta ->> 'search', 'utm_source', 80),
    'um', public.trf2_search_param(p_meta ->> 'search', 'utm_medium', 80),
    'uc', public.trf2_search_param(p_meta ->> 'search', 'utm_campaign', 120),
    'ck', CASE
            WHEN coalesce(p_meta ->> 'search', '') ~ '(^|[?&])gclid=' THEN 'gclid'
            WHEN coalesce(p_meta ->> 'search', '') ~ '(^|[?&])gbraid=' THEN 'gbraid'
            WHEN coalesce(p_meta ->> 'search', '') ~ '(^|[?&])wbraid=' THEN 'wbraid'
            WHEN coalesce(p_meta ->> 'search', '') ~ '(^|[?&])fbclid=' THEN 'fbclid'
            WHEN coalesce(p_meta ->> 'search', '') ~ '(^|[?&])msclkid=' THEN 'msclkid'
          END,
    'rd', nullif(regexp_replace(lower(substring(coalesce(p_meta ->> 'referrer', '') from '^https?://([^/:?#]+)')), '^www\.', ''), ''),
    'rf', CASE WHEN coalesce(p_meta ->> 'search', '') ~ '(^|[?&])ref=' THEN 1 END,
    'ap', p_meta ->> 'ap'
  ))
  - CASE WHEN regexp_replace(lower(substring(coalesce(p_meta ->> 'referrer', '') from '^https?://([^/:?#]+)')), '^www\.', '')
            ~ '(^|\.)(guardiens\.fr|lovable\.app|lovable\.dev)$|^localhost$|^accounts\.google\.com$' THEN 'rd' ELSE '' END
$function$;

CREATE OR REPLACE FUNCTION public.admin_channel_leads(p_from date, p_to date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_from timestamptz := (p_from::timestamp AT TIME ZONE 'Europe/Paris');
  v_to timestamptz := ((p_to + 1)::timestamp AT TIME ZONE 'Europe/Paris');
  v_rows jsonb;
  v_sits bigint;
BEGIN
  -- Repère : trf2_leads.
  IF coalesce(auth.role(), '') <> 'service_role'
     AND (auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  WITH first_views AS (
    SELECT DISTINCT ON (e.metadata ->> 'visit_id')
           e.metadata ->> 'visit_id' AS visit_id,
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
    SELECT public.derive_signup_channel(src) AS channel, src ->> 'uc' AS campaign
    FROM first_views
  ),
  cohort AS (
    SELECT pr.id, coalesce(s.channel, 'inconnu') AS channel, s.utm_campaign AS campaign
    FROM public.profiles pr
    LEFT JOIN public.profile_signup_sources s ON s.user_id = pr.id
    WHERE pr.created_at >= v_from AND pr.created_at < v_to
      AND (pr.account_status IS NULL OR pr.account_status::text <> 'deleted')
      AND NOT public.has_role(pr.id, 'admin'::public.app_role)
  ),
  acts AS (
    SELECT c.id, c.channel, c.campaign,
      EXISTS (SELECT 1 FROM public.sits st WHERE st.user_id = c.id AND st.published_at IS NOT NULL) AS published,
      EXISTS (SELECT 1 FROM public.applications a WHERE a.sitter_id = c.id) AS applied,
      (EXISTS (SELECT 1 FROM public.small_missions m WHERE m.user_id = c.id AND m.status <> 'cancelled')
        OR EXISTS (SELECT 1 FROM public.small_mission_responses r WHERE r.responder_id = c.id)) AS helped,
      (EXISTS (SELECT 1 FROM public.outings o WHERE o.organizer_id = c.id AND o.status <> 'cancelled')
        OR EXISTS (SELECT 1 FROM public.outing_attendees t WHERE t.user_id = c.id)) AS outing
    FROM cohort c
  ),
  v_by AS (
    SELECT channel, campaign, grouping(campaign) AS total_row, count(*) AS visits
    FROM visits GROUP BY GROUPING SETS ((channel), (channel, campaign))
  ),
  s_by AS (
    SELECT channel, campaign, grouping(campaign) AS total_row,
      count(*) AS signups,
      count(*) FILTER (WHERE published) AS published_members,
      count(*) FILTER (WHERE applied) AS applicants,
      count(*) FILTER (WHERE helped) AS helpers,
      count(*) FILTER (WHERE outing) AS outing_members
    FROM acts GROUP BY GROUPING SETS ((channel), (channel, campaign))
  ),
  merged AS (
    SELECT coalesce(v.channel, s.channel) AS channel,
           coalesce(v.campaign, s.campaign) AS campaign,
           (coalesce(v.total_row, s.total_row) = 0) AS is_campaign,
           coalesce(v.visits, 0) AS visits,
           coalesce(s.signups, 0) AS signups,
           coalesce(s.published_members, 0) AS published_members,
           coalesce(s.applicants, 0) AS applicants,
           coalesce(s.helpers, 0) AS helpers,
           coalesce(s.outing_members, 0) AS outing_members
    FROM v_by v
    FULL JOIN s_by s
      ON s.channel = v.channel
     AND s.total_row = v.total_row
     AND s.campaign IS NOT DISTINCT FROM v.campaign
  )
  -- Lignes de canal (is_campaign faux) puis lignes de campagne ; une campagne
  -- vide (is_campaign vrai, campaign nul) = arrivées sans campagne.
  SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.is_campaign, m.signups DESC, m.visits DESC, m.channel, m.campaign NULLS LAST), '[]'::jsonb)
  INTO v_rows
  FROM merged m;

  SELECT count(*) INTO v_sits
  FROM public.sits st
  WHERE st.published_at >= v_from AND st.published_at < v_to;

  RETURN jsonb_build_object('sits_published', v_sits, 'rows', v_rows);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_channel_leads(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_channel_leads(date, date) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.trf2_page_view_source(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trf2_search_param(text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trf2_page_view_source(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.trf2_search_param(text, text, integer) TO service_role;
