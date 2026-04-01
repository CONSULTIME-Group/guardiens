
-- ÉTAPE 1 — Colonne environments dans owner_profiles
ALTER TABLE public.owner_profiles
ADD COLUMN IF NOT EXISTS environments text[]
NOT NULL DEFAULT '{}';

-- ÉTAPE 2 — Colonne environments dans sits (équivalent de "gardes")
ALTER TABLE public.sits
ADD COLUMN IF NOT EXISTS environments text[]
NOT NULL DEFAULT '{}';

-- ÉTAPE 3 — Fonction de validation des environnements
CREATE OR REPLACE FUNCTION public.validate_environments()
RETURNS TRIGGER AS $$
DECLARE
  allowed text[] := ARRAY[
    'ville','campagne','montagne',
    'lac','vignes','foret'
  ];
  env text;
BEGIN
  IF NEW.environments IS NOT NULL THEN
    IF array_length(NEW.environments, 1) > 3 THEN
      RAISE EXCEPTION 'Maximum 3 environnements autorisés';
    END IF;
    FOREACH env IN ARRAY NEW.environments LOOP
      IF NOT (env = ANY(allowed)) THEN
        RAISE EXCEPTION 'Environnement % non autorisé. Valeurs acceptées : ville, campagne, montagne, lac, vignes, foret', env;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger sur owner_profiles
DROP TRIGGER IF EXISTS check_environments_owner ON public.owner_profiles;
CREATE TRIGGER check_environments_owner
BEFORE INSERT OR UPDATE OF environments
ON public.owner_profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_environments();

-- Trigger sur sits
DROP TRIGGER IF EXISTS check_environments_garde ON public.sits;
CREATE TRIGGER check_environments_garde
BEFORE INSERT OR UPDATE OF environments
ON public.sits
FOR EACH ROW
EXECUTE FUNCTION public.validate_environments();

-- ÉTAPE 4 — Fonction de résolution avec fallback
CREATE OR REPLACE FUNCTION public.get_garde_environments(
  p_garde_id uuid
) RETURNS text[] AS $$
DECLARE
  result text[];
BEGIN
  SELECT
    CASE
      WHEN array_length(s.environments, 1) > 0
      THEN s.environments
      ELSE COALESCE(op.environments, '{}')
    END INTO result
  FROM public.sits s
  LEFT JOIN public.owner_profiles op
    ON op.user_id = s.user_id
  WHERE s.id = p_garde_id;

  RETURN COALESCE(result, '{}');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ÉTAPE 5 — Index GIN pour performance
CREATE INDEX IF NOT EXISTS idx_owner_profiles_environments
  ON public.owner_profiles USING GIN (environments);

CREATE INDEX IF NOT EXISTS idx_sits_environments
  ON public.sits USING GIN (environments);
