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
      scp.noindex AS old_noindex,
      (SELECT count(*) FROM public.profiles p
        WHERE p.role IN ('sitter','both')
          AND p.city ILIKE '%' || scp.city || '%')::int AS new_s,
      (SELECT count(*) FROM public.sits s
        WHERE s.status = 'published'
          AND s.city ILIKE '%' || scp.city || '%')::int AS new_a
    FROM public.seo_city_pages scp
  ), upd AS (
    UPDATE public.seo_city_pages scp
    SET sitter_count = c.new_s,
        active_sits_count = c.new_a,
        noindex = CASE WHEN COALESCE(scp.noindex, false) AND c.new_s > 0 THEN false ELSE scp.noindex END,
        seo_dirty_at = CASE WHEN c.old_s <> c.new_s OR c.old_a <> c.new_a THEN now() ELSE scp.seo_dirty_at END,
        updated_at = now()
    FROM calc c
    WHERE scp.id = c.id
      AND (c.old_s <> c.new_s OR c.old_a <> c.new_a OR (COALESCE(c.old_noindex, false) AND c.new_s > 0))
    RETURNING (c.old_s <> c.new_s OR c.old_a <> c.new_a) AS counts_changed,
              (COALESCE(c.old_noindex, false) AND c.new_s > 0) AS became_indexable
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

REVOKE ALL ON FUNCTION public.recalc_seo_city_page_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalc_seo_city_page_counts() TO service_role;