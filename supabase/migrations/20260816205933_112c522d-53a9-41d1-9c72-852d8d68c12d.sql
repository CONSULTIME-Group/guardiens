-- Garde-fou d'indexation des pages programmatiques (villes et départements).

-- 1. Pages département : colonnes noindex et seo_dirty_at, miroir des pages ville.
ALTER TABLE public.seo_department_pages ADD COLUMN IF NOT EXISTS noindex boolean NOT NULL DEFAULT false;
ALTER TABLE public.seo_department_pages ADD COLUMN IF NOT EXISTS seo_dirty_at timestamptz;

-- 2. Recalcul des pages département.
-- Comptage exact par code postal via dept_code_from_postal, complété par le
-- rapprochement sur les villes du département pour les profils sans code
-- postal valide. Règle bidirectionnelle : sitter_count = 0 bascule en
-- noindex, sitter_count > 0 repasse en indexable. seo_dirty_at est posé
-- quand un compteur bouge ou quand noindex bascule, pour régénérer le
-- cache prerendu.
CREATE OR REPLACE FUNCTION public.recalc_seo_department_page_counts()
RETURNS TABLE(pages_changed integer, pages_indexed integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed integer := 0;
  v_indexed integer := 0;
BEGIN
  WITH calc AS (
    SELECT
      sdp.id,
      sdp.sitter_count AS old_s,
      sdp.active_sits_count AS old_a,
      COALESCE(sdp.noindex, false) AS old_noindex,
      (SELECT count(*) FROM public.profiles p
        WHERE p.role IN ('sitter','both')
          AND (
            public.dept_code_from_postal(p.postal_code) = d.code
            OR EXISTS (
              SELECT 1 FROM public.seo_city_pages scp
              WHERE scp.department = sdp.department
                AND p.city ILIKE '%' || scp.city || '%'
            )
          ))::int AS new_s,
      (SELECT count(*) FROM public.sits s
        WHERE s.status = 'published'
          AND s.departement_code = d.code)::int AS new_a
    FROM public.seo_department_pages sdp
    JOIN public.departements d ON d.nom = sdp.department
  ), upd AS (
    UPDATE public.seo_department_pages sdp
    SET sitter_count = c.new_s,
        active_sits_count = c.new_a,
        noindex = (c.new_s = 0),
        seo_dirty_at = CASE
          WHEN c.old_s IS DISTINCT FROM c.new_s
            OR c.old_a IS DISTINCT FROM c.new_a
            OR c.old_noindex <> (c.new_s = 0)
          THEN now() ELSE sdp.seo_dirty_at END,
        updated_at = now()
    FROM calc c
    WHERE sdp.id = c.id
      AND (c.old_s IS DISTINCT FROM c.new_s
        OR c.old_a IS DISTINCT FROM c.new_a
        OR c.old_noindex <> (c.new_s = 0))
    RETURNING (c.old_s IS DISTINCT FROM c.new_s OR c.old_a IS DISTINCT FROM c.new_a) AS counts_changed,
              (c.old_noindex AND c.new_s > 0) AS became_indexable
  )
  SELECT count(*) FILTER (WHERE counts_changed)::int,
         count(*) FILTER (WHERE became_indexable)::int
  INTO v_changed, v_indexed
  FROM upd;

  pages_changed := COALESCE(v_changed, 0);
  pages_indexed := COALESCE(v_indexed, 0);
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.recalc_seo_department_page_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalc_seo_department_page_counts() TO service_role;

-- 3. Pages ville : règle bidirectionnelle et seuil de contenu propre.
-- noindex si aucun gardien (dans les deux sens), si le contenu propre est
-- sous 1 000 caractères, ou si la page est une page de test.
CREATE OR REPLACE FUNCTION public.recalc_seo_city_page_counts()
RETURNS TABLE(pages_changed integer, pages_indexed integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed integer := 0;
  v_indexed integer := 0;
BEGIN
  WITH calc AS (
    SELECT
      scp.id,
      scp.sitter_count AS old_s,
      scp.active_sits_count AS old_a,
      COALESCE(scp.noindex, false) AS old_noindex,
      (SELECT count(*) FROM public.profiles p
        WHERE p.role IN ('sitter','both')
          AND p.city ILIKE '%' || scp.city || '%')::int AS new_s,
      (SELECT count(*) FROM public.sits s
        WHERE s.status = 'published'
          AND s.city ILIKE '%' || scp.city || '%')::int AS new_a,
      (length(coalesce(scp.content, '')) < 1000) AS thin_content,
      (scp.slug LIKE 'test-%') AS is_test
    FROM public.seo_city_pages scp
  ), upd AS (
    UPDATE public.seo_city_pages scp
    SET sitter_count = c.new_s,
        active_sits_count = c.new_a,
        noindex = (c.new_s = 0 OR c.thin_content OR c.is_test),
        seo_dirty_at = CASE
          WHEN c.old_s IS DISTINCT FROM c.new_s
            OR c.old_a IS DISTINCT FROM c.new_a
            OR c.old_noindex <> (c.new_s = 0 OR c.thin_content OR c.is_test)
          THEN now() ELSE scp.seo_dirty_at END,
        updated_at = now()
    FROM calc c
    WHERE scp.id = c.id
      AND (c.old_s IS DISTINCT FROM c.new_s
        OR c.old_a IS DISTINCT FROM c.new_a
        OR c.old_noindex <> (c.new_s = 0 OR c.thin_content OR c.is_test))
    RETURNING (c.old_s IS DISTINCT FROM c.new_s OR c.old_a IS DISTINCT FROM c.new_a) AS counts_changed,
              (c.old_noindex AND c.new_s > 0 AND NOT c.thin_content AND NOT c.is_test) AS became_indexable
  )
  SELECT count(*) FILTER (WHERE counts_changed)::int,
         count(*) FILTER (WHERE became_indexable)::int
  INTO v_changed, v_indexed
  FROM upd;

  pages_changed := COALESCE(v_changed, 0);
  pages_indexed := COALESCE(v_indexed, 0);
  RETURN NEXT;
END;
$$;

-- 4. Cron quotidien département, 2 minutes après le recalcul ville (04:05).
SELECT cron.schedule(
  'recalc-seo-department-page-counts-daily',
  '7 4 * * *',
  $$SELECT public.recalc_seo_department_page_counts();$$
);

-- 5. Application immédiate des nouvelles règles.
SELECT public.recalc_seo_city_page_counts();
SELECT public.recalc_seo_department_page_counts();