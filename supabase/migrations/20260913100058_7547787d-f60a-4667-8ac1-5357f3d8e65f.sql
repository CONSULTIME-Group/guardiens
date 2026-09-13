-- 13/09/2026, N2 : vecteurs de recherche ponderes.
-- Le titre (A) domine, le chapo ou l'intro (B) suit, le corps (C) ne fait plus
-- remonter un article hors sujet au seul motif qu'il est long.
ALTER TABLE public.articles
  ALTER COLUMN search_tsv SET EXPRESSION AS (
    setweight(to_tsvector('french', public.immutable_unaccent(coalesce(title, ''))), 'A')
    || setweight(to_tsvector('french', public.immutable_unaccent(coalesce(excerpt, ''))), 'B')
    || setweight(to_tsvector('french', public.immutable_unaccent(coalesce(content, '') || ' ' || coalesce(category, ''))), 'C')
  );

ALTER TABLE public.seo_city_pages
  ALTER COLUMN search_tsv SET EXPRESSION AS (
    setweight(to_tsvector('french', public.immutable_unaccent(coalesce(city, '') || ' ' || coalesce(h1_title, ''))), 'A')
    || setweight(to_tsvector('french', public.immutable_unaccent(coalesce(intro_text, ''))), 'B')
    || setweight(to_tsvector('french', public.immutable_unaccent(coalesce(content, ''))), 'C')
  );

ALTER TABLE public.faq_entries
  ALTER COLUMN search_tsv SET EXPRESSION AS (
    setweight(to_tsvector('french', public.immutable_unaccent(coalesce(question, ''))), 'A')
    || setweight(to_tsvector('french', public.immutable_unaccent(coalesce(answer, ''))), 'B')
  );

REINDEX INDEX public.articles_search_tsv_idx;
REINDEX INDEX public.seo_city_pages_search_tsv_idx;
REINDEX INDEX public.faq_entries_search_tsv_idx;