---
name: Langue supportée (français uniquement)
description: Site monolingue français depuis le 17/08/2026. Repli français forcé pour tout paramètre ?lang non supporté. Ne jamais réintroduire en/de/it/es sans lot SEO dédié.
type: constraint
---

# Langue supportée : fr

Guardiens est monolingue français depuis le 17/08/2026. L'allemand (de), l'italien (it), l'espagnol (es) puis l'anglais (en) ont été retirés du produit le même jour.

**Pourquoi :** 876 URLs exclues par noindex dans Search Console, dont 185 variantes `?lang=` sur 286 échantillonnées. Les traductions d'articles de/it/es (créées en un batch le 10/06/2026, jamais modifiées) étaient toutes noindex. La combinaison `noindex, follow` + canonique vers le français est déconseillée par Google (le noindex peut retomber sur la cible canonique). 202 canoniques rejetées et 107 doublons sans canonique remontaient en parallèle.

**Règles :**
- `SUPPORTED_LANGS = ["fr"]` dans `src/i18n/index.ts`. Ne jamais réintroduire en/de/it/es sans lot SEO dédié.
- Un paramètre `?lang=` explicite mais non supporté force le repli français (jamais le choix mémorisé ni le navigateur) : `resolveInitialLang` dans `src/lib/lang.ts`, `LangUrlSync.tsx`. Verrou : `src/__tests__/lang-removed-locales-fallback.test.tsx`.
- Une URL `?lang=en|de|it|es` ou toute autre valeur non supportée doit rendre : `html lang="fr"`, `index, follow`, canonique auto-référente sans paramètre.
- Les traductions de/it/es sont définitivement supprimées (table d'archive détruite le 17/08/2026, décision assumée, aucune restauration possible). La table `article_translations` n'existe plus en base ; aucune traduction d'article n'est conservée.
- Aucune alternate hreflang n'est émise, nulle part. La source de vérité `PageMeta.tsx` ne déclare plus de `translatedLangs` ni `hreflangLangs`, et le sitemap n'émet aucune balise `xhtml:link`. Guardiens n'a plus qu'une seule langue à déclarer.
- `LangUrlSync` ne réécrit jamais l'URL et l'application n'émet jamais de lien interne portant `?lang=`. La seule source de ces URLs restantes est la mémoire de Google et d'anciens liens externes. Le composant se contente de recaler la langue sur le français à chaque navigation.
- Résidu inerte assumé : `supabase/functions/_shared/decline-reasons.ts` garde des branches de/it (emails transactionnels, repli fr, le front ne peut plus émettre ces codes). Les codes ISO pays du géocodeur (`es` = Espagne, etc.) sont hors scope langue.
