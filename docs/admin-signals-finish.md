# Fiabilité des signaux administratifs : livraison du 20 septembre 2026

Autorisation : « Termine le chantier », puis confirmation du rechargement.
Les trois correctifs Edge sont déployés. Les passages métier restent à observer
aux horaires naturels ; aucun traitement ni envoi de test n'a été déclenché.

## Code livré

| Fonction | Déploiement UTC, 20 septembre | Code final vérifié |
| --- | --- | --- |
| nudge-owner-pending-application | 06:23, confirmé par Lovable | 18c2f84157fa3cbffb64c902d87468322181777a |
| nudge-stale-draft | 06:26:49, confirmé par Lovable | 19bf3cf1163af09b84163e58594a540c8e80f206 |
| nudge-untapped-cities | 06:30, confirmé par Lovable | 5bb7c1f8c2121f310f285e77674a24cb5c657dce |

Propriétaires : déduplication historique message_id et moderne
metadata.idempotency_key, avec le template réellement envoyé et les états
sent/pending/deferred ; erreurs futures par étape et code SQL/HTTP borné.
La cause précise des deux erreurs du 19 septembre à 17:00 reste inconnue.

Brouillons : garde admin/service avant traitement, mode manuel conservé.

Villes : même garde ; rafraîchissement par type/entité des alertes ouvertes,
sans réécrire leur date initiale ni rouvrir les incidents résolus ; reprise
bornée si clôture concurrente ; compteurs de succès et d'échec.

Les cinq fichiers applicatifs/tests distants correspondent octet par octet
aux fichiers validés. Le commit propriétaire a63a89e77 et le commit final18c2f8415
ont un diff vide : le dernier commit n'a pas changé le code déployé.
Aucun frontend, autre Edge, secret, dépendance, configuration ou cron modifié.

## Validation et limites

122 tests applicatifs locaux réussis le 20 septembre : owner dedup29,
finish Edge25, owner auth16, city coverage12, scheduled auth40.
Lovable a aussi exécuté les29 et25 tests des deux lots.
Les43 scénarios PostgreSQL de réconciliation et8 scénarios de droits restent
les validations réussies du19septembre ; non rejoués en production.

Propriétaires : OPTIONS200 et quatre POST publics401, 06:26:52–06:27:19UTC.
Brouillons : OPTIONS200 et quatre POST publics401, 06:29:37–06:30:07UTC.
Villes : OPTIONS200 et quatre POST publics401, 06:33:38–06:34:04UTC.
Les tests publics n'utilisent jamais de clé serveur et ne prouvent pas
l'exécution métier autorisée. Les tests locaux valident admin/service
avec dépendances inertes.

À06:33:14UTC : zéro cron_run_log des trois Edge depuis06:20.
À06:33:33UTC : zéro email_send_log des templates réels
owner-pending-application-nudge, discussion-stalled-nudge, sit-draft-reminder.
Aucun test email/push. Un statut sent ou une acceptation fournisseur n'est
pas une preuve de livraison au membre.

## SQL déjà appliqués, ne pas rejouer

Les deux fichiers conservés sous supabase/sql/pending sont des archives
de revue, déjà appliquées le19septembre20:38UTC. Leur intégration Git ne
doit pas exécuter les SQL ni déclencher de workflow de migration.

- detect_pending_applications : corps MD5ebfa933ba8859a2f8c69e5d46b236962,
  ACL postgres/service_role. Refus anon/authenticated42501 réellement testés
  le19septembre ; résultat service conservé.
- auto_resolve_admin_signals : MD5afa214b667a88b6860a86433eb7df701,
  ACL et propriétés préservées. Règles nurturing/backlog maintenues.

Définitions relues inchangées le20septembre06:19:49UTC.
Passage naturel du20septembre05:30:07.726858UTC : sept clôtures prouvées
(nurturing1, backlog1, brouillons2, discussions2, ville1), plus une ville
abaissée de critical à warning. Les sept candidatures viewed restent ouvertes.

Crons142,155,168,485 actifs, horaires et empreintes inchangés à06:23:32UTC.
Prochains passages : brouillons20septembre07:00UTC, propriétaires09:00UTC,
villes23septembre08:00UTC. Digest hebdomadaire attendu mercredi23septembre.

## Hors de ce lot

À06:29:52UTC : zéro erreur applicative ouverte,98 erreurs de scripts tiers
ignorées. À06:30:38UTC :24 signaux critiques,138 avertissements et1 information.
Plusieurs signaux relèvent d'une action membre/recrutement, pas d'un bug.

Le typecheck global reste en échec sur quatre erreurs préexistantes :
trois TS2339 dans lazy-with-retry-guard.test.ts et un TS2769 dans
AdminAnalytics.tsx. La réussite des tests ciblés ne rend pas la CI globale verte.

Restent notamment la supervision des statuts failed/partial et du dry_run,
l'audit des autres autorisations/RLS, la double consommation Prerender,
les contenus et pipelines SEO, les quotas et autres contextes d'Alma,
l'alignement analytics/textes de consentement, les dépendances à qualifier
et les parcours complets. Voir la fiche d'audit globale pour les priorités.
