# Déploiement de la base Guardiens : règle de fiabilité

## Incident Papeete du 07/11/2026

La PR 235 avait ajouté `drizzle/migrations/0115_errfix_distance_file_gardiens.sql` sur `main`, mais aucune migration SQL n'avait été exécutée sur la base de production. `sitter_digest_queue.distance_km` était restée en `numeric(6,2)`. Le trigger de publication a tenté d'y écrire plus de 10 000 km, entraînant une erreur PostgreSQL 22003 et le rollback de l'annonce. La colonne a été corrigée directement en production le 07/11, puis vérifiée en `numeric(8,2)`.

## Gouvernance

1. Une PR contenant une migration ne constitue **pas** un déploiement SQL. Une publication Lovable non plus.
2. Toute nouvelle migration Drizzle à partir de 0115 doit avoir des **contrats de post-déploiement** dans `scripts/db/production-contracts.json`. Le job GitHub `coverage` refuse une migration sans contrat.
3. Exécuter la migration via le processus DBA / opérateur autorisé, avec revue et sauvegarde appropriées. Ne pas lancer automatiquement des DDL en production depuis un `push` GitHub.
4. Déclencher `db-production-drift` (Actions > Run workflow). Attendre le statut **vert** du job `production` avant d'annoncer le correctif comme déployé. Sans secret de production, ce vert porte l'avertissement « Contrôle manuel requis » : seul le contrôle manuel des contrats vaut preuve.
5. Le job de production tourne aussi tous les matins et lors d'un push SQL sur `main`. Rouge = une migration n'a pas de contrat, ou un contrat diverge sur la base (migration non appliquée ou modifiée). Accès absent = avertissement « Contrôle manuel requis ».
6. Vérifier fonctionnellement le parcours impacté avec un compte autorisé. Une vérification SQL verte seule ne constitue pas une recette d'interface.

## Configuration initiale indispensable

Dans les paramètres GitHub du dépôt, créer l'environnement `production` et définir le secret **`GUARDIENS_PROD_DATABASE_URL`** : URL PostgreSQL de connexion **réservée à un rôle de lecture seule**, avec TLS activé. Ne jamais mettre cette URL dans une PR, un journal ou un fichier versionné. Le rôle doit pouvoir lire `information_schema.columns` et `pg_trigger`. Protéger cet environnement selon les règles du dépôt.

Sans ce secret, le job `production` n'exécute pas la sonde : il affiche l'avertissement **« Contrôle manuel requis »** (annotation et résumé du run). C'est le cas aujourd'hui, la base étant gérée par Lovable Cloud sans accès PostgreSQL direct depuis GitHub (constat du 09/11/2026). Le contrôle se fait alors à la main : après chaque migration appliquée, exécuter chaque requête de contrat de `scripts/db/production-contracts.json` sur la base de production (connecteur Lovable, lecture seule) et noter les résultats dans la livraison. Le job `coverage`, lui, continue de bloquer toute migration sans contrat. Le job de couverture local n'a besoin d'aucun secret. Pour ajouter une migration de données, documenter une assertion de résultat fiable plutôt que d'ajouter un contrôle fictif.

## Limites du dispositif

- Il ne compare pas automatiquement tout le schéma ou les migrations historiques : les migrations antérieures à 0115 ne sont pas rétroactivement couvertes. Une remise à plat du journal Drizzle et des migrations historiques est un chantier distinct.
- Les contrats démontrent des **invariants constatés**, pas l'exécution exacte d'une migration, et ne remplacent pas les tests fonctionnels.
- Le workflow GitHub **ne bloque pas automatiquement la publication Lovable** : intégrer ce statut dans la procédure de publication et, si disponible, une protection de branche sur le job `coverage`.
- Aucune écriture automatique dans `error_logs` tant qu'une recette applicative n'a pas confirmé la résolution.
