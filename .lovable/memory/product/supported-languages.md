---
name: Langues supportées (fr, en uniquement)
description: de/it/es supprimés le 17/08/2026. Repli français forcé pour tout paramètre ?lang non supporté. Ne jamais réintroduire de/it/es sans lot SEO dédié.
type: constraint
---

# Langues supportées : fr, en

L'allemand (de), l'italien (it) puis l'espagnol (es) ont été retirés du produit le 17/08/2026.

**Pourquoi :** 876 URLs exclues par noindex dans Search Console, dont 185 variantes `?lang=` sur 286 échantillonnées. Les traductions d'articles de/it/es (créées en un batch le 10/06/2026, jamais modifiées) étaient toutes noindex. La combinaison `noindex, follow` + canonique vers le français est déconseillée par Google (le noindex peut retomber sur la cible canonique). 202 canoniques rejetées et 107 doublons sans canonique remontaient en parallèle.

**Règles :**
- `SUPPORTED_LANGS = ["fr", "en"]` dans `src/i18n/index.ts`. Ne jamais réintroduire de/it/es sans lot SEO dédié.
- Un paramètre `?lang=` explicite mais non supporté force le repli français (jamais le choix mémorisé ni le navigateur) : `resolveInitialLang` dans `src/lib/lang.ts`, `LangUrlSync.tsx`. Verrou : `src/__tests__/lang-removed-locales-fallback.test.tsx`.
- Une URL `?lang=de|it|es` doit rendre : `html lang="fr"`, `index, follow`, canonique auto-référente sans paramètre.
- Les 212 lignes `article_translations` de/it/es sont archivées dans `public.article_translations_archive` (table renommée, suppression réversible). Seules les 102 traductions anglaises restent actives.
- Alternates hreflang du sitemap : dérivés de `translatedLangs` dans `src/data/siteRoutes.ts` (même source de vérité que PageMeta). Seule la home déclare une traduction statique (en). Les pages sans traduction réelle n'émettent aucun alternate.
- Résidu inerte assumé : `supabase/functions/_shared/decline-reasons.ts` garde des branches de/it (emails transactionnels, repli fr, le front ne peut plus émettre ces codes). Les codes ISO pays du géocodeur (`es` = Espagne, etc.) sont hors scope langue.
