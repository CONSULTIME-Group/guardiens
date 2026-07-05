
-- 1) SEO city pages : nettoyage surgical des mentions de date
UPDATE public.seo_city_pages
SET meta_description = regexp_replace(
      regexp_replace(meta_description, '\s+jusqu''(au|en)[^.]*2026', '', 'gi'),
      '\s+', ' ', 'g'
    ),
    intro_text = regexp_replace(
      regexp_replace(intro_text, '\s+jusqu''(au|en)[^.]*2026', '', 'gi'),
      '\s+', ' ', 'g'
    ),
    updated_at = now(),
    seo_dirty_at = now()
WHERE meta_description ~* 'jusqu''(au|en)[^.]*2026'
   OR intro_text ~* 'jusqu''(au|en)[^.]*2026';

-- 2) FAQ : dépublication des entrées obsolètes (dates de bascule + prix affichés)
UPDATE public.faq_entries
SET published = false,
    updated_at = now()
WHERE answer ~* '14 juillet 2026|1er octobre 2026|30 septembre 2026|6,99|essai|période gratuite';

-- 3) Traductions : suppression des versions obsolètes, régénération par pipeline
DELETE FROM public.article_translations
WHERE content ~* '14 juillet 2026|1er octobre 2026|30 septembre 2026|6,99|0 €|gratuité jusqu';
