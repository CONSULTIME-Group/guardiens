# Clôture prudente des anciens backlogs digest

Statut : **appliqué en production après GO le 19 septembre 2026 à 19:27 UTC**.
La clôture métier reste attendue au passage naturel, sans déclenchement manuel.

L'alerte `digest_queue_morning_backlog` du 8 septembre reste ouverte après
vidage de la file. La fonction de réconciliation quotidienne n'a pas de règle
de rétablissement pour ce type de signal.

Le SQL `supabase/sql/pending/20260919_digest_backlog_recovery.sql` ajoute une
seule règle à `auto_resolve_admin_signals()`, en conservant les règles existantes
et leurs droits. Il ne déclenche aucune réconciliation et n'envoie rien.

La règle exige un signal système de source `sitter-daily-digest`, puis le dernier
passage nominal du digest, postérieur à l'alerte, achevé avec succès depuis
moins de 26 heures. Ce délai couvre la réconciliation quotidienne avant le
digest suivant, y compris le changement d'heure. Un résultat `empty_queue`
explicite est recevable ; `lock_held` ne l'est pas. Un traitement normal doit
avoir zéro reliquat, zéro refus de claim, aucune erreur et aucun arrêt au budget.
Une ligne encore `queued`, créée au plus tard à la fin du passage de reprise
(ou sans date fiable), interdit la clôture. Les nouvelles entrées postérieures
attendent le digest suivant et ne maintiennent pas un ancien incident ouvert.

Une file soldée ne garantit pas la livraison des emails : les lignes `skipped`
existent aussi. Les alertes distinctes de perte de diffusion, d'adresse invalide
et de claims restent inchangées. Une erreur non journalisée du cron reste une
limite de l'observabilité existante.

## Vérification du 19 septembre 2026

À 19:19:30 UTC, la simulation SELECT sélectionne exactement l'alerte du
8 septembre à 08:06:40.289771 UTC. Dernier passage recevable : 19 septembre
08:05:09.282–08:05:09.486 UTC, `success`, `empty_queue`. Aucune ligne queued.
Fonction active inchangée : MD5 `6a340c11098280731b8e38d80bff486a`.
Cron 64 et cron 168 actifs et inchangés. Aucune écriture de production.

40 scénarios PGlite réussis, dont défaut initial, reprise, reliquat ancien,
nouvelles entrées, erreur récente, données manquantes ou incohérentes,
non-régression nurturing, anciennes règles, idempotence de réconciliation,
droits publics refusés et refus d'appliquer sur une définition divergente.

Exécution avec PGlite déjà installé localement :

```sh
PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node scripts/test-digest-backlog-recovery.mjs
```

## Procédure d’application et retour arrière

Relire la définition et les droits avant application. La transaction refuse
une définition différente de celle auditée ou des droits inattendus. Ne pas
retirer cette garde pour forcer l'application. Appliquer uniquement le SQL,
tracer le changement dans Git, puis relire définition, droits et compteurs.
Ne pas appeler manuellement `auto_resolve_admin_signals()` ni une Edge/cron.
La clôture interviendra au prochain passage naturel d'administration si les
conditions sont encore remplies. Prochaine échéance connue : 20 septembre
05:30 UTC / 07:30 Paris. Aucun déploiement frontend/Edge nécessaire.

Pour annuler avant cette échéance, restaurer seulement la définition précédente
conservée dans `drizzle/migrations/0000_resolve_recovered_nurturing_signal.sql`,
après vérification de l'absence de changement concurrent. Ne pas rouvrir en
masse les signaux déjà réconciliés.

## Contrôle après application

À 19:27:40.428905 UTC, la définition active correspond exactement au SQL testé
(MD5 `960e3c2f55893df7b29b409f1cc31fb4`). Propriétaire postgres,
SECURITY DEFINER, search_path public et ACL strictement inchangés :
service_role autorisé, anon/authenticated refusés. Crons 64 et 168 inchangés.
Une alerte backlog reste ouverte, zéro ligne queued. Aucun appel de
réconciliation, cron/Edge, email ou push effectué. Le fichier SQL reste dans
`sql/pending` pour conserver son chemin de revue et de test ; ce chemin ne
signifie plus que l’application de production est en attente. Ne pas le rejouer.
