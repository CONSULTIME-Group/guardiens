# Diagnostic lecture seule, nudge-affinity-onboarding

Aucune modification, aucun déploiement, aucune invocation de fonction, aucun email, aucune écriture. Uniquement des lectures (code du dépôt, cron_run_log, email_send_log, logs analytiques).

## Verdict

L'échec vient de l'appel sortant `fetch(SUPABASE_URL + "/functions/v1/send-transactional-email")` dans la boucle par destinataire, qui est **rejeté** (promesse en erreur), pas retourné en réponse 429. Le rejet remonte au `catch` du handler, qui appelle `run.fail`, d'où le statut `failed` avec `metrics` vide.

Ce n'est donc pas Resend, et ce n'est pas le compteur `skipped` du code : un 429 HTTP de `send-transactional-email` produirait `emails_skipped` et un run `success`. Ici la boucle est interrompue avant `run.finish`.

## Preuves

1. `cron_run_log` (lecture) : 11 exécutions `failed` depuis le 08/09, la dernière le 18/09 18:00:08 → 18:00:45, `metrics` vide à chaque fois. Dernier `success` le 07/09 18:00 (detected 31, emails_sent 25).
2. `email_send_log` entre 17:59 et 18:02 le 18/09 : exactement 2 lignes `affinity-onboarding-nudge`, statut `deferred`, à 18:00:20 et 18:00:25, sans message d'erreur. Le travail progressait donc, puis s'est arrêté net environ 20 secondes plus tard, cohérent avec un rejet à l'appel suivant et non avec une erreur de détection ou de RPC.
3. Même signature d'erreur dans `cron_run_log` pour deux autres fonctions qui invoquaient `send-transactional-email` en boucle : `nudge-sitter-dormant` (dernier échec 06/09) et `send-mutual-aid-weekly-digest` (dernier échec 25/08). Les deux ont cessé d'échouer après avoir été outillées contre ce cas.
4. Le code de `nudge-sitter-dormant` documente et traite explicitement ce rejet : `postWithBackoff` intercepte l'erreur levée par `fetch`, lit `err.retryAfterMs` et `err.name === "RateLimitError"`, puis interrompt proprement le lot. La forme de l'erreur attendue correspond exactement au message observé, « Rate limit exceeded for trace ... Retry after NNNNNms. ». `nudge-affinity-onboarding` ne possède aucun équivalent : son `fetch` est nu, donc tout rejet fait tomber l'exécution entière.
5. `send-sitter-daily-digest` et `send-seasonal-nurture` contiennent la même reconnaissance (`parseRetryAfterMs`, `isRateLimitFailure`, lots espacés) et n'apparaissent pas dans les échecs.

Étage exact : couche d'invocation de fonction à fonction (passerelle Edge), au niveau de l'appel sortant vers `send-transactional-email`, hôte `<projet>.supabase.co`, chemin `/functions/v1/send-transactional-email`, sans query. L'identifiant « trace » du message est propre à cette passerelle, il n'apparaît dans aucun message Resend du dépôt.

## Limites de rétention, ce qui n'est pas disponible

Les logs Edge accessibles à Lovable ne couvrent pas le 17 ni le 18 septembre. Fenêtre réellement interrogeable au moment du diagnostic : environ 10 minutes, du 19/09 05:40 au 19/09 05:50 UTC, toutes sources confondues (`function_logs`, `function_edge_logs`, `edge_logs`, `postgres_logs`). Une requête explicite du 17/09 00:00 au 19/09 06:00 ne retourne que des lignes du 19/09 à partir de 05:40.

Conséquence : aucune stack trace, aucun numéro de ligne, aucun message de runtime du 18/09 18:00 ne peut être produit. Le diagnostic ci-dessus repose sur `cron_run_log`, `email_send_log` et le code, pas sur les logs Edge de l'incident, qui sont expirés. Les seules lignes Edge visibles pour cette fonction aujourd'hui sont des OPTIONS 200 et des POST 401 de contrôle d'authentification, sans rapport avec l'incident.

## Ce que ce diagnostic n'affirme pas

- La valeur exacte du quota et son échelle (par trace, par worker, par projet) n'est pas lisible depuis les données accessibles.
- La raison de la bascule du 07/09 au 08/09 n'est pas établie ici. Piste à confirmer de votre côté sur vos agrégats : volume simultané d'envois à 18:00 UTC et concurrence avec d'autres pipelines d'emails à la même minute.

## Suite proposée, si vous la demandez

Aucune refonte. Une seule fonction touchée, `nudge-affinity-onboarding` : entourer l'appel sortant d'un équivalent de `postWithBackoff` déjà éprouvé dans `nudge-sitter-dormant`, afin que la saturation interrompe proprement le lot, reporte les destinataires restants et termine le run en `partial` avec métriques, au lieu de perdre l'exécution entière. À faire seulement sur votre GO explicite.
