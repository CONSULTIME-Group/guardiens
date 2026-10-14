-- Lot J1 (14/10/2026) : preuve d'acceptation des textes légaux.
--
-- Constat (audit juridique du 14/10/2026) : l'article 20.1 des CGU invoque
-- les « traces d'acceptation des CGU » comme preuve, mais aucune table ni
-- colonne ne gardait la version acceptée ni la date. En cas de litige,
-- l'éditeur ne pouvait pas prouver quelle version un membre avait acceptée.
--
-- Principe : le serveur tient les versions en vigueur (legal_document_versions)
-- et écrit lui-même la ligne d'acceptation ; le navigateur ne choisit ni la
-- version ni la date.
--   - inscription par email : la case cochée part dans les métadonnées
--     (legal_accepted = 'signup'), un trigger sur auth.users écrit les lignes,
--     quel que soit l'appareil où l'adresse est confirmée ;
--   - Google : les métadonnées ne passent pas, la source est gardée en
--     localStorage puis transmise au retour par record_my_legal_acceptance,
--     acceptée seulement pour un compte créé il y a moins de 30 minutes ;
--   - nouvelle version des textes (lot J2b) : source 'reaccept', sans limite
--     d'âge du compte.
-- Une inscription ne doit jamais échouer à cause de cette trace.
-- Rejouable : IF NOT EXISTS, ON CONFLICT, DROP ... IF EXISTS.

-- 1. Versions en vigueur, lisibles par tous.
CREATE TABLE IF NOT EXISTS public.legal_document_versions (
  document     text PRIMARY KEY CHECK (document IN ('cgu', 'cgs', 'privacy')),
  version      text NOT NULL,
  published_on date NOT NULL
);

-- Versions publiées par le lot J2a (CGU v8, CGS v2, confidentialité v5).
INSERT INTO public.legal_document_versions (document, version, published_on) VALUES
  ('cgu', '8', DATE '2026-10-14'),
  ('cgs', '2', DATE '2026-10-14'),
  ('privacy', '5', DATE '2026-10-14')
ON CONFLICT (document) DO UPDATE
  SET version = EXCLUDED.version, published_on = EXCLUDED.published_on;

ALTER TABLE public.legal_document_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Legal versions are public" ON public.legal_document_versions;
CREATE POLICY "Legal versions are public" ON public.legal_document_versions
  FOR SELECT TO anon, authenticated USING (true);
REVOKE ALL ON public.legal_document_versions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.legal_document_versions TO anon, authenticated;
GRANT ALL ON public.legal_document_versions TO service_role;

-- 2. Acceptations : une ligne par membre, document et version.
CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document    text NOT NULL CHECK (document IN ('cgu', 'cgs', 'privacy')),
  version     text NOT NULL,
  source      text NOT NULL CHECK (source IN ('signup', 'signup_google', 'login_google', 'reaccept')),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, document, version)
);
CREATE INDEX IF NOT EXISTS legal_acceptances_user_idx ON public.legal_acceptances (user_id);

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members read their own acceptances" ON public.legal_acceptances;
CREATE POLICY "Members read their own acceptances" ON public.legal_acceptances
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
-- Aucune écriture directe : seules les fonctions ci-dessous écrivent.
REVOKE ALL ON public.legal_acceptances FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.legal_acceptances TO authenticated;
GRANT ALL ON public.legal_acceptances TO service_role;

-- 3. Écriture interne : toutes les versions en vigueur pour un membre.
CREATE OR REPLACE FUNCTION public.record_legal_acceptance_for(p_user uuid, p_source text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.legal_acceptances (user_id, document, version, source)
  SELECT p_user, v.document, v.version, p_source
    FROM public.legal_document_versions v
  ON CONFLICT (user_id, document, version) DO NOTHING;
END;
$function$;
REVOKE ALL ON FUNCTION public.record_legal_acceptance_for(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_legal_acceptance_for(uuid, text) TO service_role;

-- 4. Inscription par email : case cochée transmise en métadonnées.
CREATE OR REPLACE FUNCTION public.record_legal_acceptance_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(NEW.raw_user_meta_data ->> 'legal_accepted', '') = 'signup' THEN
    PERFORM public.record_legal_acceptance_for(NEW.id, 'signup');
  END IF;
  RETURN NEW;
EXCEPTION WHEN others THEN
  -- Une inscription ne doit jamais échouer pour cette trace.
  RAISE WARNING 'record_legal_acceptance_on_signup: %', SQLERRM;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.record_legal_acceptance_on_signup() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_record_legal_acceptance_on_signup ON auth.users;
CREATE TRIGGER trg_record_legal_acceptance_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.record_legal_acceptance_on_signup();

-- 5. Retour de Google ou nouvelle version : appelée par le membre pour soi.
CREATE OR REPLACE FUNCTION public.record_my_legal_acceptance(p_source text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_created timestamptz;
BEGIN
  IF v_uid IS NULL OR p_source NOT IN ('signup_google', 'login_google', 'reaccept') THEN
    RETURN false;
  END IF;
  IF p_source IN ('signup_google', 'login_google') THEN
    SELECT created_at INTO v_created FROM auth.users WHERE id = v_uid;
    -- Seule une inscription récente vaut acceptation par Google.
    IF v_created IS NULL OR v_created < now() - interval '30 minutes' THEN
      RETURN false;
    END IF;
  END IF;
  PERFORM public.record_legal_acceptance_for(v_uid, p_source);
  RETURN true;
END;
$function$;
REVOKE ALL ON FUNCTION public.record_my_legal_acceptance(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_my_legal_acceptance(text) TO authenticated, service_role;

-- Contrôle : aucune écriture ouverte à anon ou authenticated.
DO $check$
BEGIN
  IF has_table_privilege('authenticated', 'public.legal_acceptances', 'INSERT')
     OR has_table_privilege('anon', 'public.legal_acceptances', 'INSERT') THEN
    RAISE EXCEPTION 'legal_acceptances ne doit pas être écrivable par le site';
  END IF;
END
$check$;
