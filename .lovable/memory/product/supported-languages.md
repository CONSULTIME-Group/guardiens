---
name: Langues supportées (fr, en, es uniquement)
description: de/it supprimés le 17/08/2026. Repli français forcé pour tout paramètre ?lang non supporté. Ne jamais réintroduire de/it sans lot SEO dédié.
type: constraint
---

# Langues supportées : fr, en, es

L'allemand (de) et l'italien (it) ont été retirés du produit le 17/08/2026.

**Pourquoi :** 876 URLs exclues par noindex dans Search Console, dont 185 variantes `?lang=` sur 286 échantillonnées. Les 141 traductions d'articles de/it (créées en un batch le 10/06/2026, jamais modifiées) étaient toutes noindex. La combinaison `noindex, follow` + canonique vers le français est déconseillée par Google (le noindex peut retomber sur la cible canonique). 202 canoniques rejetées et 107 doublons sans canonique remontaient en parallèle.

**Règles :**
- `SUPPORTED_LANGS = ["fr", "en", "es"]` dans `src/i18n/index.ts`. Ne jamais réintroduire de/it sans lot SEO dédié.
- Un paramètre `?lang=` explicite mais non supporté force le repli français (jamais le choix mémorisé ni le navigateur) : `resolveInitialLang` dans `src/lib/lang.ts`, `LangUrlSync.tsx`. Verrou : `src/__tests__/lang-removed-locales-fallback.test.tsx`.
- Une URL `?lang=de|it` doit rendre : `html lang="fr"`, `index, follow`, canonique auto-référente sans paramètre.
- Les 141 lignes `article_translations` de/it sont archivées dans `public.article_translations_archive_de_it` (suppression réversible).
- Alternates hreflang du sitemap : dérivés de `translatedLangs` dans `src/data/siteRoutes.ts` (même source de vérité que PageMeta). Seule la home déclare des traductions statiques (en, es). Les pages sans traduction réelle n'émettent aucun alternate.
- Résidu inerte assumé : `supabase/functions/_shared/decline-reasons.ts` garde des branches de/it (emails transactionnels, repli fr, le front ne peut plus émettre ces codes). Les codes ISO pays du géocodeur (`de` = Allemagne, `it` = Italie) sont hors scope langue.
