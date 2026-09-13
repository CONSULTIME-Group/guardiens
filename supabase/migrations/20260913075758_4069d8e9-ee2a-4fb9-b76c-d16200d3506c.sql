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
  -- Seuil de pertinence retenu : 0.15, exprime en part du meilleur resultat de
  -- la meme source. Les rangs bruts ne sont pas comparables d'une source a
  -- l'autre (mesure du 13/09/2026 : FAQ 0.47, article 1.3e-04, page ville
  -- 4.6e-08 sur des resultats tous pertinents), un seuil absolu unique
  -- eliminerait donc des sources entieres. Le score renvoye est le rang
  -- normalise par le meilleur de sa source, penalise de moitie quand il vient
  -- du repli permissif.
  v_min_share constant real := 0.15;
  v_loose_penalty constant real := 0.5;
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
  WITH art AS (
    SELECT 'article'::text AS src,
           a.title::text AS ttl,
           ('/actualites/' || a.slug)::text AS lnk,
           left(regexp_replace(coalesce(a.excerpt, a.content, ''), '<[^>]*>', ' ', 'g'), 600)::text AS snp,
           ts_rank_cd(a.search_tsv, v_q, 6)::real AS raw,
           false AS loose
    FROM public.articles a
    WHERE a.published = true AND a.search_tsv @@ v_q
  ),
  faq_strict AS (
    SELECT f.question::text AS ttl,
           left(regexp_replace(coalesce(f.answer, ''), '<[^>]*>', ' ', 'g'), 600)::text AS snp,
           ts_rank_cd(f.search_tsv, v_q, 6)::real AS raw
    FROM public.faq_entries f
    WHERE f.published = true AND f.search_tsv @@ v_q
  ),
  -- Repli par similarite trigramme sur la question seule (corpus de 30 lignes).
  -- Rattrape les ecarts de radical du stemmer francais (verifier / verification).
  faq_trgm AS (
    SELECT f.question::text AS ttl,
           left(regexp_replace(coalesce(f.answer, ''), '<[^>]*>', ' ', 'g'), 600)::text AS snp,
           similarity(public.immutable_unaccent(lower(f.question)), lower(v_norm))::real AS raw
    FROM public.faq_entries f
    WHERE f.published = true
      AND similarity(public.immutable_unaccent(lower(f.question)), lower(v_norm)) >= 0.20
  ),
  faq AS (
    SELECT 'faq'::text AS src, y.ttl, '/faq'::text AS lnk, min(y.snp) AS snp,
           max(y.raw)::real AS raw, false AS loose
    FROM (SELECT * FROM faq_strict UNION ALL SELECT * FROM faq_trgm) y
    GROUP BY y.ttl
  ),
  tips_base AS (
    SELECT t.fact_type::text AS ttl,
           left(regexp_replace(coalesce(t.content, ''), '<[^>]*>', ' ', 'g'), 600)::text AS snp,
           to_tsvector('french', public.immutable_unaccent(coalesce(t.content, '') || ' ' || coalesce(t.fact_type, ''))) AS tsv
    FROM public.alma_public_tips t
  ),
  tips_strict AS (
    SELECT b.ttl, b.snp, ts_rank_cd(b.tsv, v_q, 6)::real AS raw, false AS loose
    FROM tips_base b
    WHERE b.tsv @@ v_q
  ),
  tips_loose AS (
    SELECT b.ttl, b.snp, ts_rank_cd(b.tsv, v_q_or, 6)::real AS raw, true AS loose
    FROM tips_base b
    WHERE b.tsv @@ v_q_or
      AND NOT EXISTS (SELECT 1 FROM tips_strict)
  ),
  tips AS (
    SELECT 'conseil'::text AS src, z.ttl, '/conseils'::text AS lnk, z.snp, z.raw, z.loose
    FROM (SELECT * FROM tips_strict UNION ALL SELECT * FROM tips_loose) z
  ),
  villes AS (
    SELECT 'ville'::text AS src,
           coalesce(c.h1_title, c.city)::text AS ttl,
           ('/house-sitting/' || c.slug)::text AS lnk,
           left(regexp_replace(coalesce(c.intro_text, c.content, ''), '<[^>]*>', ' ', 'g'), 600)::text AS snp,
           ts_rank_cd(c.search_tsv, v_q, 6)::real AS raw,
           false AS loose
    FROM public.seo_city_pages c
    WHERE v_city_hit = true
      AND c.published = true
      AND c.search_tsv @@ v_q
  ),
  allrows AS (
    SELECT * FROM art
    UNION ALL SELECT * FROM faq
    UNION ALL SELECT * FROM tips
    UNION ALL SELECT * FROM villes
  ),
  scored AS (
    SELECT r.src, r.ttl, r.lnk, r.snp,
           (r.raw / nullif(max(r.raw) OVER (PARTITION BY r.src), 0))::real AS share,
           r.loose
    FROM allrows r
  ),
  kept AS (
    SELECT s.src, s.ttl, s.lnk, s.snp,
           (s.share * CASE WHEN s.loose THEN v_loose_penalty ELSE 1 END)::real AS score,
           row_number() OVER (PARTITION BY s.src ORDER BY s.share DESC, s.ttl) AS rn
    FROM scored s
    WHERE s.share >= v_min_share
  )
  SELECT k.src, k.ttl, k.lnk, k.snp, k.score
  FROM kept k
  WHERE k.rn <= v_per_source
  ORDER BY k.score DESC, k.src, k.ttl
  LIMIT 5;
END;
$function$;

COMMENT ON FUNCTION public.search_alma_knowledge(text, integer) IS
  'Recherche interne Alma. Sources : articles, FAQ, conseils publics (alma_public_tips), pages de ville. Normalisation par longueur (ts_rank_cd drapeaux 2|4), score relatif au meilleur resultat de chaque source, seuil de pertinence 0.15, quotas de 2 par source et 5 lignes au total, pages de ville uniquement si la question nomme une ville connue, repli trigramme sur la FAQ et repli permissif OU sur les conseils. Les anecdotes alma_cultural_facts hors conseils sont exclues.';

GRANT EXECUTE ON FUNCTION public.search_alma_knowledge(text, integer) TO authenticated, service_role;