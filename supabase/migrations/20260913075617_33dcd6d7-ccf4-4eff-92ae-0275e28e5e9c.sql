CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

CREATE OR REPLACE FUNCTION public.search_alma_knowledge(p_query text, p_limit integer DEFAULT 3)
RETURNS TABLE(source text, title text, url text, snippet text, rank real)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_q tsquery;
  v_q_or tsquery;
  v_norm text := public.immutable_unaccent(coalesce(p_query, ''));
  v_per_source int := least(greatest(1, coalesce(p_limit, 3)), 2);
  -- Seuil de pertinence retenu : 0.001.
  -- Mesure du 13/09/2026 : avec la normalisation par longueur (drapeaux 2|4),
  -- un resultat pertinent se situe au dessus de 0.005, alors que le bruit
  -- typique (page ville de Toulon sur « mon chat ne mange plus ») tombe a
  -- 1.4e-07. Le seuil 0.001 coupe donc le bruit sans toucher aux bons resultats.
  v_min_rank constant real := 0.001;
  v_city_hit boolean := false;
BEGIN
  IF btrim(v_norm) = '' THEN
    RETURN;
  END IF;

  v_q := websearch_to_tsquery('french', v_norm);
  IF v_q IS NULL OR numnode(v_q) = 0 THEN
    v_q := plainto_tsquery('french', v_norm);
  END IF;
  IF v_q IS NULL OR numnode(v_q) = 0 THEN
    RETURN;
  END IF;

  -- Repli permissif : les memes lexemes relies par OU, utilise corpus par
  -- corpus quand la requete stricte ne ramene rien.
  BEGIN
    v_q_or := replace(plainto_tsquery('french', v_norm)::text, '&', '|')::tsquery;
  EXCEPTION WHEN others THEN
    v_q_or := v_q;
  END;
  IF v_q_or IS NULL OR numnode(v_q_or) = 0 THEN
    v_q_or := v_q;
  END IF;

  -- Les pages de ville ne sortent que si la question nomme une ville connue.
  SELECT EXISTS (
    SELECT 1
    FROM public.seo_city_pages c
    WHERE c.published = true
      AND length(c.city) >= 4
      AND lower(v_norm) ~ ('(^|[^a-z0-9])'
            || regexp_replace(lower(public.immutable_unaccent(c.city)), '[^a-z0-9]+', '[^a-z0-9]+', 'g')
            || '([^a-z0-9]|$)')
  ) INTO v_city_hit;

  RETURN QUERY
  WITH art_strict AS (
    SELECT a.title::text AS title,
           ('/actualites/' || a.slug)::text AS url,
           left(regexp_replace(coalesce(a.excerpt, a.content, ''), '<[^>]*>', ' ', 'g'), 600)::text AS snippet,
           ts_rank_cd(a.search_tsv, v_q, 6) AS rank
    FROM public.articles a
    WHERE a.published = true AND a.search_tsv @@ v_q
  ),
  art_loose AS (
    SELECT a.title::text,
           ('/actualites/' || a.slug)::text,
           left(regexp_replace(coalesce(a.excerpt, a.content, ''), '<[^>]*>', ' ', 'g'), 600)::text,
           ts_rank_cd(a.search_tsv, v_q_or, 6)
    FROM public.articles a
    WHERE a.published = true AND a.search_tsv @@ v_q_or
      AND NOT EXISTS (SELECT 1 FROM art_strict)
  ),
  art AS (
    SELECT 'article'::text AS source, x.* FROM (
      SELECT * FROM art_strict UNION ALL SELECT * FROM art_loose
    ) x
    WHERE x.rank >= v_min_rank
    ORDER BY x.rank DESC
    LIMIT v_per_source
  ),
  faq_strict AS (
    SELECT f.question::text AS title,
           '/faq'::text AS url,
           left(regexp_replace(coalesce(f.answer, ''), '<[^>]*>', ' ', 'g'), 600)::text AS snippet,
           ts_rank_cd(f.search_tsv, v_q, 6) AS rank
    FROM public.faq_entries f
    WHERE f.published = true AND f.search_tsv @@ v_q
  ),
  faq_loose AS (
    SELECT f.question::text,
           '/faq'::text,
           left(regexp_replace(coalesce(f.answer, ''), '<[^>]*>', ' ', 'g'), 600)::text,
           ts_rank_cd(f.search_tsv, v_q_or, 6)
    FROM public.faq_entries f
    WHERE f.published = true AND f.search_tsv @@ v_q_or
  ),
  -- Repli par similarite trigramme sur la question seule (corpus de 30 lignes).
  -- Rattrape les ecarts de radical du stemmer francais (« verifier » vs « verification »).
  faq_trgm AS (
    SELECT f.question::text,
           '/faq'::text,
           left(regexp_replace(coalesce(f.answer, ''), '<[^>]*>', ' ', 'g'), 600)::text,
           greatest(
             similarity(public.immutable_unaccent(lower(f.question)), lower(v_norm)),
             v_min_rank
           )::real
    FROM public.faq_entries f
    WHERE f.published = true
      AND similarity(public.immutable_unaccent(lower(f.question)), lower(v_norm)) >= 0.20
  ),
  faq AS (
    SELECT 'faq'::text AS source, y.title, y.url, y.snippet, max(y.rank)::real AS rank
    FROM (
      SELECT * FROM faq_strict
      UNION ALL SELECT * FROM faq_loose
      UNION ALL SELECT * FROM faq_trgm
    ) y
    WHERE y.rank >= v_min_rank
    GROUP BY y.title, y.url, y.snippet
    ORDER BY rank DESC
    LIMIT v_per_source
  ),
  tips_base AS (
    SELECT t.fact_type::text AS title,
           '/conseils'::text AS url,
           left(regexp_replace(coalesce(t.content, ''), '<[^>]*>', ' ', 'g'), 600)::text AS snippet,
           to_tsvector('french', public.immutable_unaccent(coalesce(t.content, '') || ' ' || coalesce(t.fact_type, ''))) AS tsv
    FROM public.alma_public_tips t
  ),
  tips_strict AS (
    SELECT b.title, b.url, b.snippet, ts_rank_cd(b.tsv, v_q, 6) AS rank
    FROM tips_base b
    WHERE b.tsv @@ v_q
  ),
  tips_loose AS (
    SELECT b.title, b.url, b.snippet, ts_rank_cd(b.tsv, v_q_or, 6)
    FROM tips_base b
    WHERE b.tsv @@ v_q_or
      AND NOT EXISTS (SELECT 1 FROM tips_strict)
  ),
  tips AS (
    SELECT 'conseil'::text AS source, z.* FROM (
      SELECT * FROM tips_strict UNION ALL SELECT * FROM tips_loose
    ) z
    WHERE z.rank >= v_min_rank
    ORDER BY z.rank DESC
    LIMIT v_per_source
  ),
  villes AS (
    SELECT 'ville'::text AS source,
           coalesce(c.h1_title, c.city)::text AS title,
           ('/house-sitting/' || c.slug)::text AS url,
           left(regexp_replace(coalesce(c.intro_text, c.content, ''), '<[^>]*>', ' ', 'g'), 600)::text AS snippet,
           ts_rank_cd(c.search_tsv, v_q, 6) AS rank
    FROM public.seo_city_pages c
    WHERE v_city_hit
      AND c.published = true
      AND c.search_tsv @@ v_q
      AND ts_rank_cd(c.search_tsv, v_q, 6) >= v_min_rank
    ORDER BY rank DESC
    LIMIT v_per_source
  )
  SELECT u.source, u.title, u.url, u.snippet, u.rank
  FROM (
    SELECT * FROM art
    UNION ALL SELECT * FROM faq
    UNION ALL SELECT * FROM tips
    UNION ALL SELECT * FROM villes
  ) u
  ORDER BY u.rank DESC
  LIMIT 5;
END;
$function$;

COMMENT ON FUNCTION public.search_alma_knowledge(text, integer) IS
  'Recherche interne Alma. Sources : articles, FAQ, conseils publics (alma_public_tips), pages de ville. Normalisation par longueur (ts_rank_cd drapeaux 2|4), seuil de pertinence 0.001, quotas de 2 par source, pages de ville uniquement si la question nomme une ville connue, repli trigramme sur la FAQ. Les anecdotes alma_cultural_facts hors conseils sont exclues.';

GRANT EXECUTE ON FUNCTION public.search_alma_knowledge(text, integer) TO authenticated, service_role;