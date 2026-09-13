CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
SET search_path = public, extensions
AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('french',
      public.immutable_unaccent(
        coalesce(title,'') || ' ' || coalesce(excerpt,'') || ' ' || coalesce(content,'') || ' ' || coalesce(category,'')
      )
    )
  ) STORED;
CREATE INDEX IF NOT EXISTS articles_search_tsv_idx ON public.articles USING gin (search_tsv);

ALTER TABLE public.faq_entries
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('french',
      public.immutable_unaccent(coalesce(question,'') || ' ' || coalesce(answer,''))
    )
  ) STORED;
CREATE INDEX IF NOT EXISTS faq_entries_search_tsv_idx ON public.faq_entries USING gin (search_tsv);

ALTER TABLE public.alma_cultural_facts
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('french',
      public.immutable_unaccent(coalesce(content,'') || ' ' || coalesce(fact_type,''))
    )
  ) STORED;
CREATE INDEX IF NOT EXISTS alma_cultural_facts_search_tsv_idx ON public.alma_cultural_facts USING gin (search_tsv);

ALTER TABLE public.seo_city_pages
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('french',
      public.immutable_unaccent(
        coalesce(city,'') || ' ' || coalesce(h1_title,'') || ' ' || coalesce(intro_text,'') || ' ' || coalesce(content,'')
      )
    )
  ) STORED;
CREATE INDEX IF NOT EXISTS seo_city_pages_search_tsv_idx ON public.seo_city_pages USING gin (search_tsv);

ALTER TABLE public.alma_conversations
  ADD COLUMN IF NOT EXISTS sources_count integer;

CREATE OR REPLACE FUNCTION public.search_alma_knowledge(p_query text, p_limit int DEFAULT 3)
RETURNS TABLE (source text, title text, url text, snippet text, rank real)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q tsquery;
  v_norm text := public.immutable_unaccent(coalesce(p_query, ''));
  v_limit int := greatest(1, least(coalesce(p_limit, 3), 5));
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

  RETURN QUERY
  WITH art AS (
    SELECT 'article'::text AS source,
           a.title::text AS title,
           ('/actualites/' || a.slug)::text AS url,
           left(regexp_replace(coalesce(a.excerpt, a.content, ''), '<[^>]*>', ' ', 'g'), 600)::text AS snippet,
           ts_rank_cd(a.search_tsv, v_q) AS rank
    FROM public.articles a
    WHERE a.published = true AND a.search_tsv @@ v_q
    ORDER BY rank DESC
    LIMIT v_limit
  ),
  faq AS (
    SELECT 'faq'::text,
           f.question::text,
           '/faq'::text,
           left(regexp_replace(coalesce(f.answer, ''), '<[^>]*>', ' ', 'g'), 600)::text,
           ts_rank_cd(f.search_tsv, v_q)
    FROM public.faq_entries f
    WHERE f.published = true AND f.search_tsv @@ v_q
    ORDER BY ts_rank_cd(f.search_tsv, v_q) DESC
    LIMIT v_limit
  ),
  tips AS (
    SELECT 'conseil'::text,
           t.fact_type::text,
           '/conseils'::text,
           left(regexp_replace(coalesce(t.content, ''), '<[^>]*>', ' ', 'g'), 600)::text,
           ts_rank_cd(t.search_tsv, v_q)
    FROM public.alma_cultural_facts t
    WHERE t.active = true
      AND t.fact_type = ANY (ARRAY['pet_care_tip','dog_behavior_tip','cat_behavior_tip','home_care_tip','seasonal_advice','breed_did_you_know','mutual_aid_tip'])
      AND t.search_tsv @@ v_q
    ORDER BY ts_rank_cd(t.search_tsv, v_q) DESC
    LIMIT v_limit
  ),
  villes AS (
    SELECT 'ville'::text,
           coalesce(c.h1_title, c.city)::text,
           ('/house-sitting/' || c.slug)::text,
           left(regexp_replace(coalesce(c.intro_text, c.content, ''), '<[^>]*>', ' ', 'g'), 600)::text,
           ts_rank_cd(c.search_tsv, v_q)
    FROM public.seo_city_pages c
    WHERE c.published = true AND c.search_tsv @@ v_q
    ORDER BY ts_rank_cd(c.search_tsv, v_q) DESC
    LIMIT v_limit
  )
  SELECT * FROM (
    SELECT * FROM art
    UNION ALL SELECT * FROM faq
    UNION ALL SELECT * FROM tips
    UNION ALL SELECT * FROM villes
  ) u
  ORDER BY u.rank DESC
  LIMIT 5;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_alma_knowledge(text, int) TO authenticated, service_role;