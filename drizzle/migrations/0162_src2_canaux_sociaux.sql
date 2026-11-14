-- Lot SRC2 : canaux YouTube, TikTok et Instagram dans la source d'inscription.
-- Avant : Instagram était compté avec Facebook, YouTube et TikTok tombaient en
-- « autre_site » ou « direct ». Après : trois canaux propres, reconnus par
-- utm_source (tiktok, youtube ou yt, instagram ou ig) ou par le domaine du site
-- précédent. Seule derive_signup_channel change (même règle que
-- src/lib/signupSource.ts, parité verrouillée par channel-cases.json).
-- Lignes déjà écrites : inchangées (le canal est figé à l'inscription).
-- Rejouable. Repère : src2_canaux_sociaux.
--
-- MIGRATION ÉCRITE, NON APPLIQUÉE : à appliquer par le processus de
-- docs/database-deployment.md après validation de Jérémie.

CREATE OR REPLACE FUNCTION public.derive_signup_channel(p jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ck text := coalesce(p ->> 'ck', '');
  v_us text := coalesce(public.signup_source_clean(p ->> 'us', 80), '');
  v_um text := coalesce(public.signup_source_clean(p ->> 'um', 80), '');
  v_rd text := lower(coalesce(p ->> 'rd', ''));
  v_rf boolean := coalesce(p ->> 'rf', '') = '1';
  v_host text;
BEGIN
  IF v_rd !~ '^[a-z0-9.-]{1,120}$' THEN
    v_rd := '';
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
  IF v_ck = 'fbclid'
     OR (v_rd <> '' AND v_host ~ '(^|\.)(facebook|fb)\.')
     OR v_us IN ('facebook', 'fb') THEN
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
$$;
