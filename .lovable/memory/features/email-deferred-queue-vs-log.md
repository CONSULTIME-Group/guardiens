---
name: File différée vs journal d'emails
description: email_deferred_queue est la file de travail (vérité), email_send_log est un journal figé. Ne jamais diagnostiquer un incident d'envoi sur email_send_log seul.
type: feature
---

# File de travail vs journal, incident du 24/08/2026

## La distinction qui a trompé une analyse de production

- `email_deferred_queue` est la FILE DE TRAVAIL. C'est la seule source de vérité
  sur ce qui reste à envoyer. Ses statuts vivent : pending, processing, sent,
  superseded, abandoned, expired, failed.
- `email_send_log` est un JOURNAL. Sa ligne au statut `deferred` est figée à
  l'instant de l'enfilement. Elle ne dit rien de l'issue réelle de l'envoi.
- Le 24/08/2026, 2 167 lignes `deferred` historiques faisaient croire à une
  file bloquée. Réalité : 1 760 emails étaient partis, la file était saine.

## Comment vérifier si un email est vraiment parti

1. Joindre sur la clé d'idempotence : la ligne miroir la porte dans
   `metadata->>'idempotency_key'`, la file dans `email_deferred_queue.idempotency_key`.
2. Chercher une ligne `email_send_log` au statut `sent` avec `resend_id` non nul
   sous la même clé.
3. Le `message_id` diffère entre le miroir et l'envoi réel : toute
   déduplication par `message_id` est fausse sur ce périmètre.
4. Ne JAMAIS conclure à un incident d'envoi à partir d'un compte sur
   `email_send_log` seul.

## Mécanismes en place depuis le 24/08/2026

- `flush-deferred-emails` synchronise le miroir à chaque clôture de ligne de
  file (fonction `syncSendLogMirror`). Statuts miroir : `sent`, `cancelled`
  (quand la file dit `superseded`, la contrainte `email_send_log_status_check`
  n'admet pas `superseded`), `abandoned` avec le motif.
- Garde-fou : `email_mirror_drift_count()` (SQL, service_role) compte les
  lignes miroir `deferred` de plus de 24h sans ligne vivante dans la file.
  Porté par `email-pipeline-watchdog` (anomalie `email_deferred_mirror_drift`),
  aucun cron supplémentaire.
- Requalification rétroactive du 24/08/2026 : état d'origine préservé dans
  `_backup_email_send_log_mirror_20260824` (2 167 lignes, RLS deny-by-default).
  Après coup : 12 lignes `deferred` restantes, toutes vivantes dans la file.
