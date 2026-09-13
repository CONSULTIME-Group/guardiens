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
  v_low text;
  v_per_source int := 1;
  v_limit int := least(greatest(1, coalesce(p_limit, 3)), 5);
  v_min_share constant real := 0.15;
  v_min_share_article constant real := 0.35;
  v_loose_penalty constant real := 0.5;
  v_rank_weights constant real[] := ARRAY[0.05, 0.2, 0.6, 1.0];
  v_head_weights constant real[] := ARRAY[0, 0, 1, 1];
  v_min_abs constant real := 5e-08;
  v_city_hit boolean := false;
  v_tip_families text[] := ARRAY[]::text[];
BEGIN
  IF btrim(v_norm) = '' THEN
    RETURN;
  END IF;

  v_low := lower(v_norm);

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

  SELECT EXISTS (
    SELECT 1
    FROM public.seo_city_pages c
    WHERE c.published = true
      AND length(c.city) >= 4
      AND v_low ~ ('(^|[^a-z0-9])'
            || regexp_replace(lower(public.immutable_unaccent(c.city)), '[^a-z0-9]+', '[^a-z0-9]+', 'g')
            || '([^a-z0-9]|$)')
  ) INTO v_city_hit;

  -- Routage deterministe du conseil de secours par famille de fact_type.
  -- Les conseils sont courts et generiques, la recherche plein texte y est inoperante.
  IF (v_low ~ '(^|[^a-z])(chats?|chattes?|felins?)([^a-z]|$)') AND (v_low !~ '(^|[^a-z])chien') THEN
    v_tip_families := ARRAY['cat_behavior_tip', 'pet_care_tip'];
  ELSIF v_low ~ '(^|[^a-z])(chiens?|chiots?|canin)' THEN
    v_tip_families := ARRAY['dog_behavior_tip', 'pet_care_tip'];
  ELSIF v_low ~ '(maison|logement|appartement|plante|courrier|cle|jardin|piscine|chauffage)' THEN
    v_tip_families := ARRAY['home_care_tip'];
  ELSIF v_low ~ '(entraide|mission|coup de main|benevol)' THEN
    v_tip_families := ARRAY['mutual_aid_tip'];
  ELSIF v_low ~ '(saison|hiver|ete|canicule|froid|vacances scolaires)' THEN
    v_tip_families := ARRAY['seasonal_advice'];
  ELSIF v_low ~ '(race|elevage)' THEN
    v_tip_families := ARRAY['breed_did_you_know'];
  END IF;

  RETURN QUERY
  WITH art AS (
    SELECT 'article'::text AS src,
           a.title::text AS ttl,
           ('/actualites/' || a.slug)::text AS lnk,
           left(regexp_replace(coalesce(a.excerpt, a.content, ''), '<[^>]*>', ' ', 'g'), 600)::text AS snp,
           ts_rank_cd(v_rank_weights, a.search_tsv, v_q, 6)::real AS raw,
           false AS loose
    FROM public.articles a
    WHERE a.published = true
      AND a.search_tsv @@ v_q
      AND ts_rank_cd(v_head_weights, a.search_tsv, v_q_or, 6) > 0
      AND ts_rank_cd(v_rank_weights, a.search_tsv, v_q, 6) >= v_min_abs
      -- Un article qui porte le nom d'une ville publiee n'est servi
      -- que si la question nomme cette meme ville.
      AND NOT EXISTS (
        SELECT 1
        FROM public.seo_city_pages c
        WHERE c.published = true
          AND length(c.city) >= 4
          AND (
            lower(public.immutable_unaccent(coalesce(a.title, ''))) ~ ('(^|[^a-z0-9])'
              || regexp_replace(lower(public.immutable_unaccent(c.city)), '[^a-z0-9]+', '[^a-z0-9]+', 'g')
              || '([^a-z0-9]|$)')
            OR lower(public.immutable_unaccent(coalesce(a.slug, ''))) ~ ('(^|[^a-z0-9])'
              || regexp_replace(lower(public.immutable_unaccent(c.city)), '[^a-z0-9]+', '[^a-z0-9]+', 'g')
              || '([^a-z0-9]|$)')
          )
          AND v_low !~ ('(^|[^a-z0-9])'
              || regexp_replace(lower(public.immutable_unaccent(c.city)), '[^a-z0-9]+', '[^a-z0-9]+', 'g')
              || '([^a-z0-9]|$)')
      )
  ),
  faq_strict AS (
    SELECT f.question::text AS ttl,
           left(regexp_replace(coalesce(f.answer, ''), '<[^>]*>', ' ', 'g'), 600)::text AS snp,
           ts_rank_cd(v_rank_weights, f.search_tsv, v_q, 6)::real AS raw
    FROM public.faq_entries f
    WHERE f.published = true AND f.search_tsv @@ v_q
  ),
  faq_trgm AS (
    SELECT f.question::text AS ttl,
           left(regexp_replace(coalesce(f.answer, ''), '<[^>]*>', ' ', 'g'), 600)::text AS snp,
           similarity(public.immutable_unaccent(lower(f.question)), v_low)::real AS raw
    FROM public.faq_entries f
    WHERE f.published = true
      AND similarity(public.immutable_unaccent(lower(f.question)), v_low) >= 0.30
  ),
  faq AS (
    SELECT 'faq'::text AS src, y.ttl, '/faq'::text AS lnk, min(y.snp) AS snp,
           max(y.raw)::real AS raw, false AS loose
    FROM (SELECT * FROM faq_strict UNION ALL SELECT * FROM faq_trgm) y
    GROUP BY y.ttl
  ),
  tips_base AS (
    SELECT t.fact_type::text AS fam,
           (CASE t.fact_type
              WHEN 'home_care_tip' THEN 'Conseil maison'
              WHEN 'pet_care_tip' THEN 'Conseil animal'
              WHEN 'breed_did_you_know' THEN 'À savoir sur la race'
              WHEN 'seasonal_advice' THEN 'Conseil de saison'
              WHEN 'dog_behavior_tip' THEN 'Comportement du chien'
              WHEN 'cat_behavior_tip' THEN 'Comportement du chat'
              WHEN 'mutual_aid_tip' THEN 'Conseil entraide'
              ELSE 'Conseil'
            END)::text AS ttl,
           left(regexp_replace(coalesce(t.content, ''), '<[^>]*>', ' ', 'g'), 600)::text AS snp,
           to_tsvector('french', public.immutable_unaccent(coalesce(t.content, '') || ' ' || coalesce(t.fact_type, ''))) AS tsv
    FROM public.alma_public_tips t
  ),
  tips AS (
    SELECT 'conseil'::text AS src, b.ttl, '/conseils'::text AS lnk, b.snp,
           ts_rank_cd(b.tsv, v_q_or, 6)::real AS raw,
           true AS loose
    FROM tips_base b
    WHERE array_length(v_tip_families, 1) IS NOT NULL
      AND b.fam = ANY (v_tip_families)
      AND NOT EXISTS (SELECT 1 FROM art)
      AND NOT EXISTS (SELECT 1 FROM faq)
    ORDER BY array_position(v_tip_families, b.fam),
             ts_rank_cd(b.tsv, v_q_or, 6) DESC,
             b.ttl
    LIMIT 1
  ),
  villes AS (
    SELECT 'ville'::text AS src,
           coalesce(c.h1_title, c.city)::text AS ttl,
           ('/house-sitting/' || c.slug)::text AS lnk,
           left(regexp_replace(coalesce(c.intro_text, c.content, ''), '<[^>]*>', ' ', 'g'), 600)::text AS snp,
           ts_rank_cd(v_rank_weights, c.search_tsv, v_q, 6)::real AS raw,
           false AS loose
    FROM public.seo_city_pages c
    WHERE v_city_hit = true
      AND c.published = true
      AND c.search_tsv @@ v_q
      AND ts_rank_cd(v_head_weights, c.search_tsv, v_q_or, 6) > 0
      AND ts_rank_cd(v_rank_weights, c.search_tsv, v_q, 6) >= v_min_abs
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
    WHERE s.share >= CASE WHEN s.src = 'article' THEN v_min_share_article ELSE v_min_share END
  )
  SELECT k.src, k.ttl, k.lnk, k.snp, k.score
  FROM kept k
  WHERE k.rn <= v_per_source
  ORDER BY k.score DESC, k.src, k.ttl
  LIMIT v_limit;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.search_alma_knowledge(text, integer) TO authenticated, service_role;