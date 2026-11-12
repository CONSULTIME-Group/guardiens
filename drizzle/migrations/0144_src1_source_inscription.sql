-- Lot SRC1 (12/11/2026) : source enregistrée à l'inscription.
-- Spécification : claude/lot-src1-source-inscription-12-novembre-2026.md.
--
-- Une ligne par membre dans public.profile_signup_sources, écrite une seule
-- fois (clé primaire, ON CONFLICT DO NOTHING) :
--   inscription par email : handle_new_user lit raw_user_meta_data->'signup_source' ;
--   inscription par Google : record_signup_source(jsonb), compte de moins de 30 minutes.
-- Le canal est calculé ici, par derive_signup_channel. La valeur d'un
-- identifiant de clic publicitaire n'est jamais reçue ni stockée : seul son
-- type l'est. Lecture réservée à l'équipe par admin_signup_sources.
-- Aucune donnée existante modifiée. Rejouable. Repère : src1_source_inscription.
--
-- MIGRATION ÉCRITE, NON APPLIQUÉE : à appliquer par le processus de
-- docs/database-deployment.md après validation de Jérémie (base légale et
-- phrase de la politique de confidentialité).

CREATE TABLE IF NOT EXISTS public.profile_signup_sources (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel text NOT NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  click_id_type text CHECK (click_id_type IN ('gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid')),
  referrer_domain text,
  landing_path text,
  first_seen_at timestamptz,
  recorded_via text NOT NULL CHECK (recorded_via IN ('signup_metadata', 'oauth_return')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_signup_sources_lengths CHECK (
    char_length(channel) <= 40
    AND (utm_source IS NULL OR char_length(utm_source) <= 80)
    AND (utm_medium IS NULL OR char_length(utm_medium) <= 80)
    AND (utm_campaign IS NULL OR char_length(utm_campaign) <= 120)
    AND (referrer_domain IS NULL OR char_length(referrer_domain) <= 120)
    AND (landing_path IS NULL OR char_length(landing_path) <= 200)
  )
);

-- Aucune politique pour les membres : la table ne se lit que par
-- admin_signup_sources et ne s'écrit que par les deux fonctions ci-dessous.
ALTER TABLE public.profile_signup_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profile_signup_sources FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.profile_signup_sources TO service_role;

CREATE INDEX IF NOT EXISTS profile_signup_sources_channel_idx
  ON public.profile_signup_sources (channel);

-- Valeur de mesure nettoyée : minuscules, caractères simples, longueur bornée.
CREATE OR REPLACE FUNCTION public.signup_source_clean(p_value text, p_max integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT nullif(left(btrim(regexp_replace(lower(coalesce(p_value, '')), '[^a-z0-9 _.+~-]', '', 'g')), p_max), '')
$$;

-- Canal d'une source, par ordre de priorité (repère src1_source_inscription).
-- Même règle que deriveSignupChannel de src/lib/signupSource.ts.
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
  IF v_ck = 'fbclid'
     OR (v_rd <> '' AND v_host ~ '(^|\.)(facebook|instagram|fb)\.')
     OR v_us IN ('facebook', 'fb', 'instagram', 'ig') THEN
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

-- Écriture unique d'une source. Ne lève jamais d'erreur : une inscription
-- n'échoue pas pour une mesure. Réservée au service et aux deux appelants.
CREATE OR REPLACE FUNCTION public.signup_source_insert(p_user_id uuid, p jsonb, p_via text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ck text;
  v_rd text;
  v_lp text;
  v_first timestamptz;
  v_rows integer;
BEGIN
  IF p_user_id IS NULL OR p IS NULL OR jsonb_typeof(p) <> 'object' OR pg_column_size(p) > 2048 THEN
    RETURN false;
  END IF;

  v_ck := p ->> 'ck';
  IF v_ck IS NULL OR v_ck NOT IN ('gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid') THEN
    v_ck := NULL;
  END IF;

  v_rd := lower(coalesce(p ->> 'rd', ''));
  IF v_rd !~ '^[a-z0-9.-]{1,120}$' THEN
    v_rd := NULL;
  END IF;

  v_lp := left(regexp_replace(coalesce(p ->> 'lp', ''), '[?#].*$', ''), 200);
  IF v_lp !~ '^/' THEN
    v_lp := NULL;
  END IF;

  BEGIN
    v_first := (p ->> 'ts')::timestamptz;
    IF v_first > now() + interval '5 minutes' OR v_first < now() - interval '30 days' THEN
      v_first := NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_first := NULL;
  END;

  INSERT INTO public.profile_signup_sources (
    user_id, channel, utm_source, utm_medium, utm_campaign,
    click_id_type, referrer_domain, landing_path, first_seen_at, recorded_via
  ) VALUES (
    p_user_id,
    public.derive_signup_channel(p),
    public.signup_source_clean(p ->> 'us', 80),
    public.signup_source_clean(p ->> 'um', 80),
    public.signup_source_clean(p ->> 'uc', 120),
    v_ck, v_rd, v_lp, v_first, p_via
  )
  ON CONFLICT (user_id) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.signup_source_insert(uuid, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.signup_source_insert(uuid, jsonb, text) TO service_role;

-- Inscription Google : le site transmet la source au retour. Compte de moins
-- de 30 minutes seulement, un membre existant n'écrit rien.
CREATE OR REPLACE FUNCTION public.record_signup_source(p jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_created timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;
  SELECT u.created_at INTO v_created FROM auth.users u WHERE u.id = v_uid;
  IF v_created IS NULL OR v_created < now() - interval '30 minutes' THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = v_uid) THEN
    RETURN false;
  END IF;
  RETURN public.signup_source_insert(v_uid, p, 'oauth_return');
END;
$$;

REVOKE ALL ON FUNCTION public.record_signup_source(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_signup_source(jsonb) TO authenticated, service_role;

-- Inscription par email : corps repris de pg_get_functiondef en production
-- le 12/11/2026, plus le bloc SRC1 en fin. Le bloc ne peut pas interrompre la
-- création du compte (signup_source_insert n'échoue jamais, et un second
-- filet EXCEPTION l'entoure).
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role text;
  _intent text;
BEGIN
  _role := NEW.raw_user_meta_data ->> 'role';
  -- Lot E17 : intention d'inscription (signup_intent_detected ou choix
  -- « entraide » de l'écran C1), transmise dans les métadonnées.
  _intent := NEW.raw_user_meta_data ->> 'arrival_intent';
  IF _intent IS NOT NULL AND _intent NOT IN ('owner', 'sitter', 'entraide') THEN
    _intent := NULL;
  END IF;

  IF _role IN ('owner','sitter','both') THEN
    INSERT INTO public.profiles (id, email, role, arrival_intent)
    VALUES (NEW.id, NEW.email, _role::public.user_role, _intent)
    ON CONFLICT (id) DO NOTHING;

    IF _role IN ('sitter','both') THEN
      INSERT INTO public.sitter_profiles (user_id)
      VALUES (NEW.id)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;

    IF _role IN ('owner','both') THEN
      INSERT INTO public.owner_profiles (user_id)
      VALUES (NEW.id)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  ELSE
    INSERT INTO public.profiles (id, email, arrival_intent)
    VALUES (NEW.id, NEW.email, _intent)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Lot SRC1 (src1_source_inscription) : source d'arrivée transmise par le
  -- formulaire d'inscription. Jamais bloquant.
  BEGIN
    IF jsonb_typeof(NEW.raw_user_meta_data -> 'signup_source') = 'object' THEN
      PERFORM public.signup_source_insert(NEW.id, NEW.raw_user_meta_data -> 'signup_source', 'signup_metadata');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$function$;

-- Lecture de l'équipe : une ligne par canal, à partir de profiles (un compte
-- sans ligne de source compte dans « inconnu »). Jours bornés en heure de Paris.
-- « Publiée » = annonce avec published_at, même règle que has_published_sit (lot W0).
CREATE OR REPLACE FUNCTION public.admin_signup_sources(p_from date, p_to date)
RETURNS TABLE (
  channel text,
  signups bigint,
  owners bigint,
  sitters bigint,
  boths bigint,
  google_accounts bigint,
  email_accounts bigint,
  members_with_published_sit bigint,
  published_sits bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH cohort AS (
    SELECT pr.id,
           pr.role::text AS role,
           coalesce(s.channel, 'inconnu') AS channel,
           coalesce(u.raw_app_meta_data ->> 'provider', 'email') AS provider
    FROM public.profiles pr
    LEFT JOIN public.profile_signup_sources s ON s.user_id = pr.id
    LEFT JOIN auth.users u ON u.id = pr.id
    WHERE pr.created_at >= (p_from::timestamp AT TIME ZONE 'Europe/Paris')
      AND pr.created_at < ((p_to + 1)::timestamp AT TIME ZONE 'Europe/Paris')
  ),
  published AS (
    SELECT st.user_id, count(*) AS n
    FROM public.sits st
    WHERE st.published_at IS NOT NULL
      AND st.user_id IN (SELECT c.id FROM cohort c)
    GROUP BY st.user_id
  )
  SELECT c.channel,
         count(*)::bigint,
         count(*) FILTER (WHERE c.role = 'owner')::bigint,
         count(*) FILTER (WHERE c.role = 'sitter')::bigint,
         count(*) FILTER (WHERE c.role = 'both')::bigint,
         count(*) FILTER (WHERE c.provider = 'google')::bigint,
         count(*) FILTER (WHERE c.provider <> 'google')::bigint,
         count(p.user_id)::bigint,
         coalesce(sum(p.n), 0)::bigint
  FROM cohort c
  LEFT JOIN published p ON p.user_id = c.id
  GROUP BY c.channel
  ORDER BY count(*) DESC, c.channel;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_signup_sources(date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_signup_sources(date, date) TO authenticated, service_role;
