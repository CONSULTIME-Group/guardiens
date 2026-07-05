# Refresh IA des articles post-pivot pricing

## Contexte

Le pivot pricing du 5 juillet 2026 a mis 15 articles en `noindex = true` parce qu'ils contenaient encore des mentions obsolètes de dates de bascule (1er octobre 2026, 30 septembre 2026, 14/07/2026) et de prix (6,99 €/mois, 65 €/an, 12 € oneshot).

## Workflow

1. Ouvrir `/admin/articles/refresh-post-pivot`.
2. Cliquer sur **Preview refresh IA** pour un article standard afin de valider le rendu IA (dry_run, aucune écriture).
3. Si le diff est propre, cliquer sur **Appliquer refresh**. L'article passe `noindex = false` automatiquement.
4. Pour les 4 piliers stratégiques (voir plus bas), l'application du refresh conserve `noindex = true`. Il faut cliquer sur **Valider et sortir du noindex** avec double confirmation après relecture intégrale.
5. Vous pouvez lancer un batch **Refresh tous les 11 non-piliers** en une seule opération.

## Piliers stratégiques (validation manuelle obligatoire)

- `nouveaux-tarifs-2026`
- `premiers-pas-sur-guardiens`
- `comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers`
- `petites-missions-entraide-guardiens`

Ces slugs sont définis dans `src/config/articles-post-pivot.ts` (miroir Deno dans `supabase/functions/refresh-articles-post-pivot/pillars.ts`).

## Sécurité

- L'edge function `refresh-articles-post-pivot` exige un JWT admin ou la service role.
- Un validateur post-génération refuse toute écriture si le contenu IA contient encore un pattern proscrit (voir `validator.ts`).
- Chaque appel (dry_run compris) est tracé dans `article_refresh_logs`.

## Vérification GSC

48 h après une sortie de noindex, vérifier dans Google Search Console que l'URL est ré-indexée.
