-- Nettoyage idempotent des compétences vs catégories
DO $$
DECLARE
  v_cats text[] := ARRAY['jardin','animaux','competences','coups_de_main'];
BEGIN
  -- 1. SITTER : déplacer les catégories trouvées dans competences vers profiles.skill_categories
  WITH polluted AS (
    SELECT
      sp.user_id,
      ARRAY(
        SELECT DISTINCT c
        FROM unnest(sp.competences) AS c
        WHERE c = ANY(v_cats)
      ) AS misplaced
    FROM public.sitter_profiles sp
    WHERE sp.competences && v_cats
  )
  UPDATE public.profiles p
  SET skill_categories = ARRAY(
    SELECT DISTINCT x FROM unnest(
      COALESCE(p.skill_categories, ARRAY[]::text[]) || polluted.misplaced
    ) AS x
    WHERE x = ANY(v_cats)
  )
  FROM polluted
  WHERE p.id = polluted.user_id;

  -- 2. OWNER : idem côté owner_profiles
  WITH polluted AS (
    SELECT
      op.user_id,
      ARRAY(
        SELECT DISTINCT c
        FROM unnest(op.competences) AS c
        WHERE c = ANY(v_cats)
      ) AS misplaced
    FROM public.owner_profiles op
    WHERE op.competences && v_cats
  )
  UPDATE public.profiles p
  SET skill_categories = ARRAY(
    SELECT DISTINCT x FROM unnest(
      COALESCE(p.skill_categories, ARRAY[]::text[]) || polluted.misplaced
    ) AS x
    WHERE x = ANY(v_cats)
  )
  FROM polluted
  WHERE p.id = polluted.user_id;

  -- 3. Nettoyer les competences (sitter) : retirer catégories, vides, dédoublonner (case-insensitive)
  UPDATE public.sitter_profiles sp
  SET competences = ARRAY(
    SELECT comp FROM (
      SELECT DISTINCT ON (lower(btrim(c))) btrim(c) AS comp
      FROM unnest(sp.competences) AS c
      WHERE c IS NOT NULL
        AND btrim(c) <> ''
        AND NOT (btrim(c) = ANY(v_cats))
      ORDER BY lower(btrim(c)), c
    ) sub
  )
  WHERE sp.competences IS NOT NULL
    AND (
      sp.competences && v_cats
      OR EXISTS (SELECT 1 FROM unnest(sp.competences) AS c WHERE c IS NULL OR btrim(c) = '')
      OR cardinality(sp.competences) <> (
        SELECT count(DISTINCT lower(btrim(c))) FROM unnest(sp.competences) AS c WHERE btrim(c) <> ''
      )
    );

  -- 4. Nettoyer les competences (owner) : idem
  UPDATE public.owner_profiles op
  SET competences = ARRAY(
    SELECT comp FROM (
      SELECT DISTINCT ON (lower(btrim(c))) btrim(c) AS comp
      FROM unnest(op.competences) AS c
      WHERE c IS NOT NULL
        AND btrim(c) <> ''
        AND NOT (btrim(c) = ANY(v_cats))
      ORDER BY lower(btrim(c)), c
    ) sub
  )
  WHERE op.competences IS NOT NULL
    AND (
      op.competences && v_cats
      OR EXISTS (SELECT 1 FROM unnest(op.competences) AS c WHERE c IS NULL OR btrim(c) = '')
      OR cardinality(op.competences) <> (
        SELECT count(DISTINCT lower(btrim(c))) FROM unnest(op.competences) AS c WHERE btrim(c) <> ''
      )
    );

  -- 5. Dédoublonner profiles.skill_categories et limiter aux valeurs valides
  UPDATE public.profiles
  SET skill_categories = ARRAY(
    SELECT DISTINCT x
    FROM unnest(skill_categories) AS x
    WHERE x = ANY(v_cats)
  )
  WHERE skill_categories IS NOT NULL
    AND (
      cardinality(skill_categories) <> (
        SELECT count(DISTINCT x) FROM unnest(skill_categories) AS x WHERE x = ANY(v_cats)
      )
    );

  -- 6. Recalculer le score de complétion pour les profils touchés
  PERFORM public.calculate_profile_completion(id) FROM public.profiles;
END $$;