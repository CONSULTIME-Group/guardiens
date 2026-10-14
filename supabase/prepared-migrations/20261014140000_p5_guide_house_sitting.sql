-- Lot P5 (14/10/2026) : « Guide du house-sitting » à son adresse nationale.
--
-- L'article house-sitting-aura-guide-complet (titre « House-sitting en France :
-- pourquoi ça fonctionne ») est déjà noindex et déclare pour canonique
-- voyager-gratuitement-france-house-sitting (base, 14/10/2026). Le pied de
-- page le liait pourtant directement. La redirection (table redirects,
-- source de vérité de ArticleDetail : 301 déclaré à Prerender, remplacement
-- côté navigateur) consolide l'ancienne adresse sur la canonique.
-- Rejouable.

INSERT INTO public.redirects (scope, slug_from, slug_to, redirect_type, notes)
SELECT 'article', 'house-sitting-aura-guide-complet', 'voyager-gratuitement-france-house-sitting', 301,
       'Lot P5, 14/10/2026 : ancienne adresse AURA consolidée sur la canonique nationale'
WHERE NOT EXISTS (
  SELECT 1 FROM public.redirects WHERE scope = 'article' AND slug_from = 'house-sitting-aura-guide-complet'
)
AND EXISTS (
  SELECT 1 FROM public.articles WHERE slug = 'voyager-gratuitement-france-house-sitting' AND published
);
