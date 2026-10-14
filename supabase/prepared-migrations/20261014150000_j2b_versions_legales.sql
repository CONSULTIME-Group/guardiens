-- Lot J2b (14/10/2026) : versions légales datées et réacceptation.
--
-- Règle (CGU v9, article 15.4) : à sa première connexion après la date
-- d'effet, le membre accepte la nouvelle version par une case à cocher, et
-- cette acceptation est enregistrée. Jusqu'à cette acceptation, son accès se
-- limite à la consultation de ses données, à la messagerie liée à une garde
-- ou un coup de main convenu et à la fermeture de son compte.
--
-- Principe :
--   - legal_document_versions garde une ligne par (document, version), avec
--     published_on (mise en ligne), effective_on (entrée en vigueur) et
--     requires_reaccept (acceptation expresse exigée) ; lignes alignées sur
--     src/config/legalVersions.ts (verrou src/__tests__/j2b/) ;
--   - record_legal_acceptance_for enregistre toutes les versions publiées
--     (published_on <= jour de Paris) : un nouvel inscrit accepte aussi la
--     version annoncée et n'a rien à revalider à la date d'effet ;
--   - my_pending_legal_documents() dit au membre connecté quels documents
--     attendent son acceptation (dernière version en vigueur, exigeant une
--     réacceptation, sans trace pour lui) ;
--   - record_my_legal_acceptance('reaccept') enregistre la réacceptation.
--
-- Rejouable, que le SQL du lot J1 (20261014120000_j1_preuve_acceptation.sql)
-- soit déjà appliqué ou non : les objets J1 sont repris à l'identique
-- (IF NOT EXISTS, CREATE OR REPLACE), la clé primaire est convertie si
-- besoin. Après ce fichier, le fichier J1 ne se rejoue plus (son
-- ON CONFLICT (document) suppose l'ancienne clé).

-- 1. Une ligne par document et par version.
CREATE TABLE IF NOT EXISTS public.legal_document_versions (
  document          text NOT NULL CHECK (document IN ('cgu', 'cgs', 'privacy')),
  version           text NOT NULL,
  published_on      date NOT NULL,
  effective_on      date NOT NULL,
  requires_reaccept boolean NOT NULL DEFAULT false,
  CONSTRAINT legal_document_versions_pkey PRIMARY KEY (document, version)
);

-- Table créée par J1 (une ligne par document) : colonnes ajoutées.
ALTER TABLE public.legal_document_versions ADD COLUMN IF NOT EXISTS effective_on date;
ALTER TABLE public.legal_document_versions ADD COLUMN IF NOT EXISTS requires_reaccept boolean NOT NULL DEFAULT false;
UPDATE public.legal_document_versions SET effective_on = published_on WHERE effective_on IS NULL;
ALTER TABLE public.legal_document_versions ALTER COLUMN effective_on SET NOT NULL;

-- Clé primaire (document, version), quelle que soit la clé trouvée.
DO $pk$
DECLARE
  v_name text;
  v_cols text[];
BEGIN
  SELECT c.conname,
         array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
    INTO v_name, v_cols
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
   WHERE c.conrelid = 'public.legal_document_versions'::regclass
     AND c.contype = 'p'
   GROUP BY c.conname;

  IF v_cols IS DISTINCT FROM ARRAY['document', 'version'] THEN
    IF v_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.legal_document_versions DROP CONSTRAINT %I', v_name);
    END IF;
    ALTER TABLE public.legal_document_versions
      ADD CONSTRAINT legal_document_versions_pkey PRIMARY KEY (document, version);
  END IF;
END
$pk$;

-- Une version entre en vigueur le jour de sa publication ou après.
DO $dates$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.legal_document_versions'::regclass
       AND conname = 'legal_document_versions_dates_check'
  ) THEN
    ALTER TABLE public.legal_document_versions
      ADD CONSTRAINT legal_document_versions_dates_check CHECK (effective_on >= published_on);
  END IF;
END
$dates$;

-- 2. Calendrier, aligné exactement sur src/config/legalVersions.ts.
INSERT INTO public.legal_document_versions (document, version, published_on, effective_on, requires_reaccept) VALUES
  ('cgu', '8', DATE '2026-10-14', DATE '2026-10-14', false),
  ('cgs', '2', DATE '2026-10-14', DATE '2026-10-14', false),
  ('privacy', '5', DATE '2026-10-14', DATE '2026-10-14', false),
  ('cgu', '9', DATE '2026-10-16', DATE '2026-11-16', true),
  ('cgs', '3', DATE '2026-10-16', DATE '2026-11-16', true)
ON CONFLICT (document, version) DO UPDATE
  SET published_on = EXCLUDED.published_on,
      effective_on = EXCLUDED.effective_on,
      requires_reaccept = EXCLUDED.requires_reaccept;

-- Toute autre ligne sort du calendrier.
DELETE FROM public.legal_document_versions
 WHERE (document, version) NOT IN (
   ('cgu', '8'),
   ('cgs', '2'),
   ('privacy', '5'),
   ('cgu', '9'),
   ('cgs', '3')
 );

ALTER TABLE public.legal_document_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Legal versions are public" ON public.legal_document_versions;
CREATE POLICY "Legal versions are public" ON public.legal_document_versions
  FOR SELECT TO anon, authenticated USING (true);
REVOKE ALL ON public.legal_document_versions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.legal_document_versions TO anon, authenticated;
GRANT ALL ON public.legal_document_versions TO service_role;

-- 3. Acceptations (reprise J1 à l'identique si la table manque).
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
REVOKE ALL ON public.legal_acceptances FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.legal_acceptances TO authenticated;
GRANT ALL ON public.legal_acceptances TO service_role;

-- 4. Écriture interne : toutes les versions publiées au jour de Paris.
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
   WHERE v.published_on <= (now() AT TIME ZONE 'Europe/Paris')::date
  ON CONFLICT (user_id, document, version) DO NOTHING;
END;
$function$;
REVOKE ALL ON FUNCTION public.record_legal_acceptance_for(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_legal_acceptance_for(uuid, text) TO service_role;

-- 5. Inscription par email (reprise J1 à l'identique).
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

-- 6. Retour de Google ou réacceptation (reprise J1 à l'identique) : la
-- source 'reaccept' enregistre toutes les versions publiées.
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

-- 7. Documents à accepter par le membre connecté : pour chaque document, la
-- dernière version en vigueur au jour de Paris, si elle exige une
-- réacceptation et qu'aucune trace ne la couvre. Résultat vide sans membre.
CREATE OR REPLACE FUNCTION public.my_pending_legal_documents()
RETURNS TABLE (document text, version text, effective_on date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH in_force AS (
    SELECT DISTINCT ON (v.document)
           v.document, v.version, v.effective_on, v.requires_reaccept
      FROM public.legal_document_versions v
     WHERE v.effective_on <= (now() AT TIME ZONE 'Europe/Paris')::date
     ORDER BY v.document, v.effective_on DESC, v.published_on DESC
  )
  SELECT f.document, f.version, f.effective_on
    FROM in_force f
   WHERE auth.uid() IS NOT NULL
     AND f.requires_reaccept
     AND NOT EXISTS (
       SELECT 1
         FROM public.legal_acceptances a
        WHERE a.user_id = auth.uid()
          AND a.document = f.document
          AND a.version = f.version
     )
   ORDER BY f.document;
$function$;
REVOKE ALL ON FUNCTION public.my_pending_legal_documents() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_pending_legal_documents() TO authenticated;

-- Contrôle : clé, calendrier, droits.
DO $check$
DECLARE
  v_cols text[];
  v_rows int;
BEGIN
  SELECT array_agg(a.attname::text ORDER BY array_position(c.conkey, a.attnum))
    INTO v_cols
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
   WHERE c.conrelid = 'public.legal_document_versions'::regclass
     AND c.contype = 'p';
  IF v_cols IS DISTINCT FROM ARRAY['document', 'version'] THEN
    RAISE EXCEPTION 'legal_document_versions doit avoir la clé (document, version), trouvé %', v_cols;
  END IF;

  SELECT count(*) INTO v_rows FROM public.legal_document_versions;
  IF v_rows <> 5 THEN
    RAISE EXCEPTION 'legal_document_versions doit compter 5 lignes, trouvé %', v_rows;
  END IF;

  IF has_table_privilege('authenticated', 'public.legal_acceptances', 'INSERT')
     OR has_table_privilege('anon', 'public.legal_acceptances', 'INSERT')
     OR has_table_privilege('authenticated', 'public.legal_document_versions', 'INSERT')
     OR has_table_privilege('anon', 'public.legal_document_versions', 'INSERT') THEN
    RAISE EXCEPTION 'les tables légales ne doivent pas être écrivables par le site';
  END IF;

  IF has_function_privilege('anon', 'public.my_pending_legal_documents()', 'EXECUTE') THEN
    RAISE EXCEPTION 'my_pending_legal_documents ne doit pas être exécutable par anon';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.my_pending_legal_documents()', 'EXECUTE') THEN
    RAISE EXCEPTION 'my_pending_legal_documents doit être exécutable par authenticated';
  END IF;
  IF has_function_privilege('anon', 'public.record_my_legal_acceptance(text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.record_legal_acceptance_for(uuid, text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.record_legal_acceptance_for(uuid, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'écriture des acceptations ouverte à tort';
  END IF;
END
$check$;
