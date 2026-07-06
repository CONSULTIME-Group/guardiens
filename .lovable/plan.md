Audit lecture seule terminé, aucune modification de code proposée.

## Synthèse

L'absence perçue d'Alma s'explique par trois faits combinés :

1. **La page profil de l'utilisateur n'a aucun câblage Alma** (ni whisper proactif, ni `useAlmaCulturalFact`). Aucun whisper ne peut y apparaître, ce n'est pas un bug.
2. **Le quota `balanced` (défaut de tous les comptes) est très serré** : 1 seul `cultural_fact` par session, 3 whispers actionnables max, cooldown 5 min entre chaque, cooldown 15 min après un dismiss X, mise en sourdine totale après 2 dismiss X. En base : 663 comptes `balanced`, 1 `talkative`, 0 `silent`.
3. **La navigation ne relance pas de nouveaux whispers** car l'état du scheduler (`emittedCount`, `sessionMuted`, `lastEmittedAt`) est global à `AlmaProvider` monté dans `AppLayout` et survit aux changements de page ; `sessionStorage` mémorise aussi les surfaces déjà servies.

L'apparence « aléatoire » vient du tirage pondéré côté RPC + dedup 24 h + variabilité du pool éligible selon la surface et la race.

## Détails livrés dans l'audit

- Règles complètes de `canEmit` et `pickNext` (silent / muted / blacklisted / quota / cooldown / dismiss_cooldown ; P3 bloqué si P0/P1/P2 éligible).
- Liste exhaustive des surfaces câblées : Dashboard, Messages, PublicSitterProfile pour les whispers actionnables ; OwnerDashboard, SitterDashboard, SearchPage, CityPage, BreedPage, PublicSitterProfile pour les facts culturels.
- Confirmation que Profile, MySubscription, Favorites, Sits, SitDetail, Notifications, MesAvis, EmailPreferences, hubs SEO éditoriaux, etc. n'ont aucun câblage.
- Impact des correctifs récents : gate `isProactiveMuted` limite Alma uniquement sur `/sits/create` et `/sits/:id/edit` et pendant les 3 s après une saisie, aucun impact sur les autres surfaces.

## Options d'ajustement (à valider ensemble avant tout code)

1. Étendre les surfaces câblées (`useAlmaCulturalFact`) à Profile, MySubscription, Favorites, Sits, Notifications, SitDetail.
2. Relever `CULTURAL_FACT_LIMITS.balanced.maxPerSession` de 1 à 2-3 et ramener le cooldown DB de 24 h à 8-12 h.
3. Ajouter un indicateur persistant (pastille sur avatar Alma en topbar) signalant qu'un conseil est prêt, décorrélé du whisper éphémère.
4. Historique consultable des whispers ratés dans la session (tiroir/cloche).
5. Assouplir la gate focus pour les P3 uniquement (facts non bloquants autorisés même en saisie).
6. Query param `?alma=verbose` en dev pour bypass quota et cooldown.
7. Exposer un aperçu du prochain créneau disponible dans les préférences user, pour dédramatiser l'aléa.

## Prochaine étape

Aucune action code tant que vous n'avez pas priorisé parmi ces 7 options. Répondez avec la ou les options retenues (ex. « 1 + 2 » ou « 1, 3, 6 ») pour que je bascule en build mode sur un périmètre précis.
