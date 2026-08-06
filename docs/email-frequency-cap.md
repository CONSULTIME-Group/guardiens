# Frequency cap, bypass et file différée — référence

Source de vérité : `supabase/functions/_shared/email-cap.ts` +
`supabase/functions/send-transactional-email/index.ts` (étape 2b) +
`supabase/functions/flush-deferred-emails/index.ts`.

## 1. Limites par catégorie

Depuis le 02/08/2026, le plafond dépend de la **catégorie** de l'email
(`_shared/email-categories.ts`). Doctrine : un email déclenché par l'action
directe d'un membre identifié n'est jamais du spam, il n'est jamais plafonné.

| Catégorie | Plafond | Constante |
|---|---|---|
| `transactional` | aucun plafond de fréquence, seules les heures calmes s'appliquent | – |
| `product`, `digest` (cumul) | 1 / 24 h et 3 / 7 jours par destinataire | `CAP_NON_TX_PER_DAY`, `CAP_NON_TX_PER_WEEK` |
| `alert`, hors `nearby-sit-alert` | 1 / 24 h et 7 / 7 jours, compteur propre | `CAP_ALERT_PER_DAY`, `CAP_ALERT_PER_WEEK` |
| `nearby-sit-alert` | 3 / 24 h et 10 / 7 jours, compteur propre au gabarit | `CAP_NEARBY_SIT_PER_DAY`, `CAP_NEARBY_SIT_PER_WEEK` |
| catégorie absente ou inconnue | traitée comme `product`, donc plafonnée, avec un `console.warn` | – |

Le cumul non transactionnel est **inter-catégories** entre `product` et
`digest` : un digest consomme le même quota qu'un email produit. La catégorie
`alert` en est sortie le 05/08/2026, et le gabarit `nearby-sit-alert` en est
sorti à son tour le 06/08/2026. Un transactionnel ne consomme aucun quota et
n'en libère aucun.

### 1 bis. Pourquoi `nearby-sit-alert` a son propre compteur (06/08/2026)

Constat vérifié en base : depuis le 03/08, plus aucun `nearby-sit-alert`
n'était parti, alors que des annonces avaient été publiées les 03 et 04. Sur la
même période, 21 `alert-digest` abandonnés le 04/08, 9 `sitter-daily-digest`
abandonnés, 2 `alert-digest` abandonnés le 03/08.

Mécanique : `CAP_ALERT_PER_DAY` valait 1 et ce quota était partagé par les trois
gabarits de la catégorie. `sitter-daily-digest` part par cron tous les jours à
05h00 UTC et `alert-digest` trois fois par jour, donc le quota du jour était
systématiquement consommé par un récapitulatif avant qu'une annonce ne soit
publiée. L'alerte était ensuite reportée à `oldest + 24 h`, au-delà de sa TTL de
20 h, et comme elle figure dans `DATED_TEMPLATES`, `decideOverTtl` renvoyait
`cancel` : l'alerte n'était pas reportée, elle était détruite.

Correctif :

1. `nearby-sit-alert` sort du quota partagé et compte sur lui seul
   (`NEARBY_SIT_ALERT_TEMPLATES`). Les récapitulatifs ne consomment plus son
   quota, et réciproquement. Une alerte déclenchée par un événement réel prime
   donc toujours sur un récapitulatif automatique.
2. Chiffres retenus, 3 / jour et 10 / semaine : la plateforme a publié 16
   annonces en 30 jours sur la France entière, et un gardien n'est alerté que
   sur ses zones. Le risque de rafale est nul en pratique, ce plafond ne coupe
   que les boucles anormales.
3. Cohérence TTL : tout report de ce gabarit est plafonné à
   `NEARBY_SIT_MAX_DEFER_HOURS` (18 h), strictement inférieur à sa TTL de 20 h,
   jitter appelant de 900 s inclus. Aucun chemin de plafond ne peut donc plus
   produire un report déjà périmé.
4. Traçabilité : une annulation pour dépassement de TTL écrit une ligne
   `email_send_log` en `status = 'cancelled'` avec
   `metadata.cancel_reason = 'ttl_exceeded_nearby_sit_alert'`,
   `metadata.is_nearby_sit_alert = true` et un `error_message` lisible. Les
   alertes détruites sont donc comptables dans le tableau de bord admin.

`BYPASS_TEMPLATES` reste inchangé : une alerte annonce n'y a pas sa place, elle
reste soumise aux heures calmes et à un plafond, simplement à un plafond propre.

`CAP_PER_HOUR` et `CAP_PER_DAY` existent encore dans `email-cap.ts` pour la
compatibilité d'import, mais ne sont **plus appliqués**. Ces plafonds globaux
croisaient les compteurs entre catégories : le 31/07/2026, 44 % des tentatives
d'envoi ont été différées, certaines notifications jusqu'à 48 h. Ne pas les
réintroduire dans la logique de décision.

| Quiet hours (Europe/Paris, DST géré) | 22h00 → 08h00 | `QUIET_START_HOUR` / `QUIET_END_HOUR` |
|---|---|---|

Le décompte se fait sur `email_send_log` filtré par
`recipient_email ILIKE` + `status = 'sent'` sur les fenêtres 24h / 7j
glissantes, avec `metadata->>category IN ('product','digest','alert')`.
Un email `deferred` ne consomme pas le quota, seul un `sent` le fait.

Pression maximale théorique par destinataire et par semaine :
3 emails non transactionnels + le flux transactionnel réel, entièrement piloté
par les actions des autres membres (message, candidature, réponse).


## 2. Templates en bypass (cap + quiet hours ignorés)

Définis dans `BYPASS_TEMPLATES` (`email-cap.ts`). Aucun de ces templates
n'est jamais reporté ni mis en file — ils partent immédiatement, y compris
la nuit, y compris au-delà de 3/jour :

- `identity-verified`
- `identity-rejected`
- `relance-piece-identite`
- `dispute-resolved`
- `report-resolved`
- `cancellation-by-owner`
- `cancellation-by-sitter`
- `cancellation-review-published`
- `cancellation-response-published`
- `sit-confirmed`
- `application-accepted` (pendant strict de `sit-confirmed`, côté gardien accepté)
- `contact-reply`

Critères d'inclusion : sécurité/identité, résolution litige/signalement,
annulations, confirmation de garde, réponse humaine directe à un message.
**Tout ajout doit être justifié par une obligation légale / sécurité /
réponse humaine attendue immédiatement.** Les emails marketing, conseils,
relances soft, alertes ne doivent JAMAIS être ajoutés ici.

## 3. Flag urgent côté appelant

L'appelant peut forcer un envoi immédiat via `templateData.__urgent = true`.
Lu par :

```ts
const isUrgent = !!(templateData as any)?.__urgent
const bypass = BYPASS_TEMPLATES.has(templateName) || isUrgent
```

Comportement identique au bypass : pas de cap, pas de quiet hours, pas de
mise en file. À réserver aux flux serveur sensibles (webhooks Stripe,
finalisations critiques) — pas pour contourner le cap depuis l'UI.

## 4. Ordre de précédence (`decideDeferral`)

Pour les templates **non bypass** et **non urgent** :

1. **Quiet hours** (22h–8h Paris) → `defer` au prochain 08h00 Paris. S'applique
   à toutes les catégories, y compris transactionnelle : on ne réveille personne
   la nuit.
2. **Catégorie `transactional`** → `send`, sans aucun plafond de fréquence.
3. **`nearby-sit-alert`** (compteur propre au gabarit) :
   a. **10 envois sur 7 jours** → `defer` (`frequency_cap_category_week`).
   b. **3 envois sur 24 h** → `defer` (`frequency_cap_category_day`).
   Dans les deux cas le report est plafonné à `now + NEARBY_SIT_MAX_DEFER_HOURS`.
4. **Catégorie `alert`** (hors `nearby-sit-alert`) : 7 / 7 jours puis 1 / 24 h.
5. Catégorie non transactionnelle restante (product, digest, ou catégorie
   absente ou inconnue) :
   a. **3 envois sur 7 jours** → `defer` à `oldest + 7j + 30s`
      (`frequency_cap_category_week`).
   b. **1 envoi sur 24 h** → `defer` à `oldest + 24h + 30s`
      (`frequency_cap_category_day`).
6. Sinon → `send`.

Les motifs `frequency_cap_hour` et `frequency_cap_day` restent déclarés dans le
type `DeferDecision` pour lire l'historique de la file, mais ne sont plus jamais
produits.


Le quiet hours prime toujours sur les caps : un email refusé pour cap
pendant la nuit est reporté au matin (08h00), pas au prochain créneau cap.

Statuts journalisés : un report écrit une ligne `email_send_log` en
`deferred`, un blocage par désinscription de catégorie écrit
`unsubscribed_category`. Ces deux statuts sont autorisés par la contrainte
`email_send_log_status_check` depuis le lot 3 ; toute erreur d'insertion
produit désormais un `console.error` explicite.

## 5. Interaction `idempotencyKey` ↔ file différée

`idempotencyKey` (alias `idempotency_key`) sert à 3 protections distinctes :

### 5.1 Anti-doublon sur envois déjà partis

Avant tout traitement, on cherche dans `email_send_log` :

```ts
.eq('status', 'sent')
.filter('metadata->>idempotency_key', 'eq', idempotencyKey)
```

Si une ligne existe → réponse `{ success: true, skipped: true,
reason: 'duplicate_idempotency_key' }`. Aucun appel Resend, aucun nouvel
enregistrement.

### 5.2 Anti-doublon dans la file différée

Au moment de pousser dans `email_deferred_queue` :

```ts
.eq('idempotency_key', idempotencyKey)
.eq('template_name', templateName)
.in('status', ['pending', 'sent'])
```

Si une ligne `pending` ou `sent` existe déjà → réponse
`{ success: true, deferred: true, reason: 'already_queued' }`. Sinon insert.
Conséquence : un même `idempotencyKey` rejoué N fois pendant un pic produit
**1 seule ligne en file**.

### 5.3 Flush par `flush-deferred-emails`

Le cron lit les lignes `status='pending'` triées par `first_enqueued_at`
croissant (le plus anciennement enfilé passe en premier, pas de famine), puis
ré-appelle `send-transactional-email` en propageant l'`idempotency_key`
d'origine et l'identifiant de la ligne source (`sourceQueueId`). À ce moment :

- Le cap est ré-évalué. S'il est encore dépassé → **la ligne source elle-même
  est mise à jour** : nouveau `scheduled_for`, nouveau `defer_reason`,
  `attempts = attempts + 1`, `status` reste `pending`, et `first_enqueued_at`
  reste inchangé. Aucune nouvelle ligne n'est créée, plus aucun `superseded`
  n'est écrit sur ce chemin. Les garde-fous `MAX_ATTEMPTS` et `TTL_HOURS`
  peuvent donc réellement se déclencher, le TTL étant calculé sur
  `first_enqueued_at`.
- Une nouvelle ligne n'est insérée qu'au **premier** enfilement, quand il n'y a
  pas de `sourceQueueId`.
- Si l'envoi part → la ligne `email_send_log` `status='sent'` portant
  l'`idempotency_key` rend tout rejeu ultérieur idempotent (garde 5.1), et la
  ligne de file passe à `sent`.
- Une ligne dont l'ancienneté dépasse le TTL (36 h à partir de
  `first_enqueued_at`) passe à `expired`. Une ligne dont l'appel au sender
  échoue `MAX_ATTEMPTS` fois (6) passe à `failed`. Dans les deux cas elle ne
  déclenche plus d'envoi.



### 5.4 Recommandations clé idempotence

- **Toujours** dériver `idempotencyKey` de l'ID stable de l'événement
  déclencheur + nom du template (ex. `welcome-${userId}`,
  `booking-confirm-${bookingId}`).
- **Jamais** `Date.now()` ni `crypto.randomUUID()` côté appelant — sinon
  chaque retry crée un nouvel envoi.
- Si `idempotencyKey` est absent, il vaut `messageId` (UUID auto par
  appel) → aucune protection effective. À éviter sauf one-shot.

## 6. Tests de régression

- `supabase/functions/_shared/email-cap_test.ts` — 22 tests purs sur
  `decideDeferral`, `isQuietAt`, `nextQuietEndFrom` (DST inclus).
- `supabase/functions/_shared/email-cap-burst-sim_test.ts` — 6 simulations
  bout-en-bout (pics, quiet hours, idempotence, flush sans doublon).
- `src/__tests__/email-pressure-lots.test.ts` — plafond par catégorie,
  bornes `max_age_days`, unicité du parcours actif, garde `logMetadata`.

Toute modification de `BYPASS_TEMPLATES`, des constantes de cap, ou de la
logique de `decideDeferral` **doit** mettre à jour ces tests.

## 7. Liste de suppression (`suppressed_emails`)

Source de vérité : `supabase/functions/_shared/email-suppression.ts`.

### 7.1 Motifs autorisés

La contrainte `suppressed_emails_reason_check` accepte exactement :
`unsubscribe`, `bounce`, `complaint`, `account_deleted`. La constante
`SUPPRESSION_REASONS` en est le miroir côté code. Tout nouveau motif doit
être ajouté dans les deux endroits, sinon l'insertion échoue en silence
(l'appelant ne fait qu'un `console.error`). Le test
`src/__tests__/email-suppression-exceptions.test.ts` échoue si un motif
écrit par le code n'est pas dans la liste.

### 7.2 Exception légale : templates qui franchissent la liste

`send-transactional-email` vérifie `suppressed_emails` en fail-closed pour
toutes les catégories, sauf pour les templates de
`SUPPRESSION_BYPASS_TEMPLATES` :

| Template | Raison de l'exception |
|---|---|
| `account-deleted` | Accusé de traitement d'une demande d'effacement RGPD, preuve attendue par la CNIL. Bloqué, il priverait la personne de la preuve de traitement, y compris quand elle s'était désinscrite avant de demander l'effacement. |
| `unsubscribe-link` | Lien de désinscription et de préférences envoyé sur demande, il sert l'exercice du droit d'opposition. |

Ces deux templates servent l'exercice des droits de la personne : les
bloquer va contre l'objectif même de la liste de suppression.

NE PAS RETIRER cette exception. NE PAS y ajouter d'email produit, digest,
alerte ou marketing : la liste de suppression reste absolue pour tout le
reste. Le bypass court aussi sur le repli « jeton de désinscription déjà
consommé », qui sinon bloquerait ces mêmes envois.
