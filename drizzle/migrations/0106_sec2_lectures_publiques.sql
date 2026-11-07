-- Lot SEC2 (07/11/2026) : fin de la lecture publique directe de hero_weights
-- et competences_validees (politiques USING (true) signalées par le scanner).
-- Les visiteurs et membres lisent uniquement les colonnes utiles par deux
-- fonctions dédiées ; la table elle-même reste réservée à l'équipe admin.

-- 1. hero_weights : quatre poids de répartition du hero, lus par tous.
DROP POLICY IF EXISTS "hero_weights_read_all" ON public.hero_weights;
DROP POLICY IF EXISTS "hero_weights_admin_read" ON public.hero_weights;
CREATE POLICY "hero_weights_admin_read"
ON public.hero_weights
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON public.hero_weights FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.hero_weights TO authenticated;
GRANT ALL ON public.hero_weights TO service_role;

CREATE OR REPLACE FUNCTION public.get_hero_weights()
RETURNS TABLE (
  weight_animals integer,
  weight_home integer,
  weight_mutual_aid integer,
  weight_village integer,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT h.weight_animals, h.weight_home, h.weight_mutual_aid, h.weight_village, h.updated_at
  FROM public.hero_weights h
  WHERE h.id = 1
$$;
REVOKE ALL ON FUNCTION public.get_hero_weights() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_hero_weights() TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.get_hero_weights() IS
  'Lot SEC2 : poids publics du hero (quatre entiers et date), sans updated_by.';

-- 2. competences_validees : référentiel des savoir-faire, suggéré aux membres.
DROP POLICY IF EXISTS "competences_validees_public_read" ON public.competences_validees;

REVOKE ALL ON public.competences_validees FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competences_validees TO authenticated;
GRANT ALL ON public.competences_validees TO service_role;

CREATE OR REPLACE FUNCTION public.list_validated_competences(
  p_search text DEFAULT NULL,
  p_categorie text DEFAULT NULL,
  p_limit integer DEFAULT NULL
)
RETURNS TABLE (label text, categorie text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_limit integer := least(greatest(coalesce(p_limit, 500), 1), 500);
BEGIN
  IF auth.uid() IS NULL AND coalesce(auth.role(), '') <> 'service_role' THEN
    RETURN;
  END IF;
  IF v_search IS NOT NULL THEN
    v_search := replace(replace(replace(left(v_search, 80), '\', '\\'), '%', '\%'), '_', '\_');
  END IF;
  RETURN QUERY
    SELECT c.label, c.categorie
    FROM public.competences_validees c
    WHERE (p_categorie IS NULL OR c.categorie = p_categorie)
      AND (v_search IS NULL OR c.label ILIKE '%' || v_search || '%')
    ORDER BY c.usage_count DESC NULLS LAST, c.label
    LIMIT v_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.list_validated_competences(text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_validated_competences(text, text, integer) TO authenticated, service_role;
COMMENT ON FUNCTION public.list_validated_competences(text, text, integer) IS
  'Lot SEC2 : libellés et catégories du référentiel pour un membre connecté, 500 au plus.';

-- 3. Contrôle : plus aucune lecture directe ouverte sur ces deux tables.
DO $$
BEGIN
  IF has_table_privilege('anon', 'public.hero_weights', 'SELECT')
     OR has_table_privilege('anon', 'public.competences_validees', 'SELECT') THEN
    RAISE EXCEPTION 'SEC2 : anon lit encore une table protégée';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('hero_weights', 'competences_validees')
      AND cmd IN ('SELECT', 'ALL')
      AND btrim(coalesce(qual, '')) IN ('true', '(true)')
  ) THEN
    RAISE EXCEPTION 'SEC2 : une politique de lecture ouverte subsiste';
  END IF;
END;
$$;
