-- Lot PR1 (13/10/2026), applique en production le 13/10 vers 18 h 40 (heure de Paris).
-- Repere de version indexable des fiches gardien (lot PR1).
-- Pose par consume-seo-dirty quand il rend une fiche indexable, efface quand il
-- remplace sa copie par une version hors index. Une fiche hors index sans repere
-- est acquittee sans render : Prerender n'en garde aucune version indexable.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seo_indexed_at timestamptz;
COMMENT ON COLUMN public.profiles.seo_indexed_at IS 'Lot PR1 : derniere fiche /gardiens/:id rendue indexable par consume-seo-dirty. Hors index avec repere : copie Prerender a remplacer.';

-- Amorcage large : la regle du sitemap sans le masquage des contacts, donc un
-- sur-ensemble des fiches indexables. Un repere en trop coute un render, un
-- repere manquant laisserait une copie indexable perimee.
UPDATE public.profiles p SET seo_indexed_at = now()
  FROM public.public_profiles pp
  LEFT JOIN public.public_sitter_profiles sp ON sp.user_id = pp.id
  LEFT JOIN public.public_sitter_gallery_counts g ON g.user_id = pp.id
 WHERE p.id = pp.id
   AND p.seo_indexed_at IS NULL
   AND pp.role IN ('sitter', 'both')
   AND length(coalesce(nullif(btrim(pp.bio), ''), btrim(sp.motivation), '')) >= 80
   AND (coalesce(pp.identity_verified, false) OR coalesce(g.photo_count, 0) >= 1);
